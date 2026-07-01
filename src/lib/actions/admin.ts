"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { TAG_LEADERBOARD, TAG_MATCHES } from "@/lib/queries";
import {
  scorePodium,
  GROUP_QUALIFIER_POINTS,
  GOLDEN_BOOT_POINTS,
} from "@/lib/scoring";
import { inChunks } from "@/lib/batch";
import {
  settleMatchSideEffects,
  recomputeStreaks,
  rescoreMatchPredictions,
} from "@/lib/settle";
import type { Match } from "@/lib/types";
import { type Result, requireAdmin, isIntIn, nameKey } from "./shared";

// ---------------- Admin: enter result & rescore ----------------
export async function saveMatchResult(input: {
  matchId: number;
  homeScore: number; // 90-minute score
  awayScore: number;
  winnerTeamId: number | null; // advancer for knockout draws
  decidedIn?: "regular" | "extra_time" | "penalties" | null;
  etHome?: number | null;
  etAway?: number | null;
  pensHome?: number | null;
  pensAway?: number | null;
}): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (!isIntIn(input.homeScore, 0, 99) || !isIntIn(input.awayScore, 0, 99)) {
      return { ok: false, error: "Invalid score" };
    }
    const home = input.homeScore;
    const away = input.awayScore;

    const { data: current } = await admin
      .from("matches")
      .select("*")
      .eq("id", input.matchId)
      .single();
    if (!current) return { ok: false, error: "Match not found" };
    const m = current as Match;
    if (m.home_team_id == null || m.away_team_id == null) {
      return { ok: false, error: "Set the teams first." };
    }

    // Winner: derived from the score when decisive; required for level knockouts;
    // always null for group games. home/away are the 90-MINUTE score.
    let winner: number | null = null;
    let decidedIn: "regular" | "extra_time" | "penalties" | null = null;
    let etHome: number | null = null;
    let etAway: number | null = null;
    let pensHome: number | null = null;
    let pensAway: number | null = null;
    if (m.stage !== "group") {
      if (home > away) winner = m.home_team_id;
      else if (away > home) winner = m.away_team_id;
      else {
        if (input.winnerTeamId !== m.home_team_id && input.winnerTeamId !== m.away_team_id) {
          return { ok: false, error: "A drawn knockout needs an advancer." };
        }
        winner = input.winnerTeamId;
      }
      // How the tie was decided. A decisive 90' score is ALWAYS regular time. A
      // level 90' MUST be extra time or penalties and the caller has to say
      // which — we never silently guess "penalties", which would wrongly settle
      // the pens side bet for a tie actually won in extra time.
      if (home !== away) {
        decidedIn = "regular";
      } else if (input.decidedIn === "extra_time" || input.decidedIn === "penalties") {
        decidedIn = input.decidedIn;
      } else {
        return {
          ok: false,
          error: "A level knockout must be decided in extra time or on penalties — say which.",
        };
      }
      const opt = (v: number | null | undefined): number | null =>
        v == null ? null : isIntIn(v, 0, 40) ? v : NaN;
      etHome = opt(input.etHome);
      etAway = opt(input.etAway);
      pensHome = opt(input.pensHome);
      pensAway = opt(input.pensAway);
      if ([etHome, etAway, pensHome, pensAway].some((v) => Number.isNaN(v))) {
        return { ok: false, error: "Invalid extra-time / penalty score." };
      }
    }

    const { data: updated, error: upErr } = await admin
      .from("matches")
      .update({
        home_score: home,
        away_score: away,
        winner_team_id: winner,
        status: "final",
        decided_in: decidedIn,
        et_home: etHome,
        et_away: etAway,
        pens_home: pensHome,
        pens_away: pensAway,
      })
      .eq("id", input.matchId)
      .select("*")
      .single();
    if (upErr || !updated) return { ok: false, error: upErr?.message ?? "Match not found" };

    // Rescore every prediction for this match (shared with the results sync).
    await rescoreMatchPredictions(admin, updated as Match);

    // When the Final or 3rd-place game is settled, re-derive and score the podium.
    const settledStage = (updated as Match).stage;
    if (settledStage === "final" || settledStage === "third") {
      await settlePodiumWith(admin);
    }

    // Side bets + joker for this match, then the global streak rebuild.
    await settleMatchSideEffects(admin, updated as Match);
    await recomputeStreaks(admin);

    updateTag(TAG_MATCHES);
    updateTag(TAG_LEADERBOARD);
    revalidatePath("/predictions");
    revalidatePath("/admin/results");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Admin: assign teams to a knockout match (unlocks predictions for it).
export async function setMatchTeams(input: {
  matchId: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
}): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    if (
      input.homeTeamId != null &&
      input.awayTeamId != null &&
      input.homeTeamId === input.awayTeamId
    ) {
      return { ok: false, error: "Home and away must be different teams." };
    }
    const { error } = await admin
      .from("matches")
      .update({ home_team_id: input.homeTeamId, away_team_id: input.awayTeamId })
      .eq("id", input.matchId);
    if (error) return { ok: false, error: error.message };
    updateTag(TAG_MATCHES);
    revalidatePath("/bracket");
    revalidatePath("/admin/results");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Admin: settle a group's actual winner/runner-up and award qualifier points.
export async function settleGroup(input: {
  groupLabel: string;
  winnerId: number;
  runnerupId: number;
}): Promise<Result> {
  try {
    await requireAdmin();
    if (input.winnerId === input.runnerupId) {
      return { ok: false, error: "Winner and runner-up must be different teams." };
    }
    const admin = createAdminClient();
    const { data: preds } = await admin
      .from("group_predictions")
      .select("*")
      .eq("group_label", input.groupLabel);
    await inChunks(preds ?? [], async (p) => {
      let pts = 0;
      if (p.pred_winner_team_id === input.winnerId) pts += GROUP_QUALIFIER_POINTS;
      if (p.pred_runnerup_team_id === input.runnerupId) pts += GROUP_QUALIFIER_POINTS;
      await admin
        .from("group_predictions")
        .update({ points_awarded: pts, scored: true })
        .eq("id", p.id);
    });
    updateTag(TAG_LEADERBOARD);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Derive the actual podium from the Final + 3rd-place results and score every pick.
async function settlePodiumWith(admin: ReturnType<typeof createAdminClient>) {
  const { data: finalMatch } = await admin
    .from("matches")
    .select("*")
    .eq("stage", "final")
    .eq("status", "final")
    .maybeSingle();
  if (!finalMatch || finalMatch.home_score == null || finalMatch.away_score == null) return;

  const champ: number | null =
    finalMatch.winner_team_id ??
    (finalMatch.home_score > finalMatch.away_score
      ? finalMatch.home_team_id
      : finalMatch.away_team_id);
  const runnerUp: number | null =
    champ === finalMatch.home_team_id ? finalMatch.away_team_id : finalMatch.home_team_id;

  const { data: thirdMatch } = await admin
    .from("matches")
    .select("*")
    .eq("stage", "third")
    .eq("status", "final")
    .maybeSingle();
  const third: number | null =
    thirdMatch && thirdMatch.home_score != null && thirdMatch.away_score != null
      ? thirdMatch.winner_team_id ??
        (thirdMatch.home_score > thirdMatch.away_score
          ? thirdMatch.home_team_id
          : thirdMatch.away_team_id)
      : null;

  const actual: Record<number, number | null> = { 1: champ, 2: runnerUp, 3: third };
  const { data: preds } = await admin.from("podium_predictions").select("*");
  await inChunks(preds ?? [], async (p) => {
    const want = actual[p.position];
    const correct = want != null && p.team_id === want;
    const pts = scorePodium(p.position, correct, p.revised);
    await admin
      .from("podium_predictions")
      .update({ points_awarded: pts, scored: true })
      .eq("id", p.id);
  });
}

export async function settlePodium(): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    await settlePodiumWith(admin);
    updateTag(TAG_LEADERBOARD);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Admin: settle the Golden Boot by the top scorer's name.
export async function settleGoldenBoot(name: string): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    // Accent-insensitive: the picker stores API names ("José"), but settle by
    // hand may type "Jose" — both must match.
    const target = nameKey(String(name));
    const { data: preds } = await admin
      .from("tournament_predictions")
      .select("*")
      .eq("type", "golden_boot");
    await inChunks(preds ?? [], async (p) => {
      const hit = !!target && nameKey(p.text_value ?? "") === target;
      await admin
        .from("tournament_predictions")
        .update({ points_awarded: hit ? GOLDEN_BOOT_POINTS : 0, scored: true })
        .eq("id", p.id);
    });
    updateTag(TAG_LEADERBOARD);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Admin: (re)compute side bets / joker / streak across every
// already-final eligible match. Idempotent — for backfilling after deploy or
// re-running after tuning the scoring constants.
export async function recomputeFeatureScoring(): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const { data: finals } = await admin
      .from("matches")
      .select("*")
      .eq("status", "final")
      .order("kickoff_at");
    for (const m of (finals ?? []) as Match[]) {
      await settleMatchSideEffects(admin, m);
    }
    await recomputeStreaks(admin);
    updateTag(TAG_LEADERBOARD);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
