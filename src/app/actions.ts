"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  getMatch,
  getTeams,
  tournamentLockAt,
  TAG_LEADERBOARD,
  TAG_MATCHES,
} from "@/lib/queries";
import { isLocked } from "@/lib/format";
import {
  scorePrediction,
  scorePodium,
  featuresLive,
  GROUP_QUALIFIER_POINTS,
  GOLDEN_BOOT_POINTS,
  type SideBetPick,
} from "@/lib/scoring";
import { settleMatchSideEffects, recomputeStreaks } from "@/lib/settle";
import type { Match, PodiumPosition, PredOutcome, Prediction, SideBetMarket } from "@/lib/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) throw new Error("Not signed in");
  return { supabase, userId: sub };
}

async function requireAdmin() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
  if (!data?.is_admin) throw new Error("Admin only");
  return { userId };
}

/** Run row updates a few at a time instead of strictly one-by-one. */
async function inChunks<T>(items: T[], fn: (item: T) => Promise<unknown>, size = 20) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

const isIntIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Accent/case-insensitive name key: "José Martínez " → "josemartinez". */
const nameKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// ---------------- Match predictions ----------------
export async function savePrediction(input: {
  matchId: number;
  outcome: PredOutcome;
  homeScore: number;
  awayScore: number;
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (!isIntIn(input.homeScore, 0, 20) || !isIntIn(input.awayScore, 0, 20)) {
      return { ok: false, error: "Scores must be between 0 and 20." };
    }
    const home = input.homeScore;
    const away = input.awayScore;

    const match = await getMatch(input.matchId);
    if (!match) return { ok: false, error: "Match not found" };
    // Friendly pre-check; RLS enforces the same deadline authoritatively.
    if (isLocked(match.kickoff_at) || match.status !== "scheduled") {
      return { ok: false, error: "This match is locked — the deadline has passed." };
    }

    // Derive the outcome from the scoreline so the pair can never disagree.
    // A level knockout still needs the player's advancer call.
    let outcome: PredOutcome;
    if (home > away) outcome = "home";
    else if (away > home) outcome = "away";
    else if (match.stage === "group") outcome = "draw";
    else if (input.outcome === "home" || input.outcome === "away") outcome = input.outcome;
    else return { ok: false, error: "Pick who advances after a draw." };

    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: userId,
        match_id: input.matchId,
        pred_home_score: home,
        pred_away_score: away,
        pred_outcome: outcome,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" }
    );
    if (error) {
      // RLS blocks writes once the match has kicked off — surface a friendly message.
      if (error.code === "42501" || /row-level security/i.test(error.message)) {
        return { ok: false, error: "This match is locked — the deadline has passed." };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/bracket");
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath("/predictions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Side bet: Both teams to score (opt-in gamble) ----------------
export async function saveSideBet(input: {
  matchId: number;
  market: SideBetMarket;
  pick: SideBetPick;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();

    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (input.pick !== "yes" && input.pick !== "no") return { ok: false, error: "Invalid pick" };
    if (input.market !== "btts" && input.market !== "et" && input.market !== "pens") {
      return { ok: false, error: "Invalid market" };
    }

    if (!featuresLive()) return { ok: false, error: "Side bets unlock Monday." };

    const match = await getMatch(input.matchId);
    if (!match) return { ok: false, error: "Match not found" };
    if (isLocked(match.kickoff_at) || match.status !== "scheduled") {
      return { ok: false, error: "This match is locked — the deadline has passed." };
    }
    // BTTS is allowed on any match; the ET/pens markets only exist in knockouts.
    if ((input.market === "et" || input.market === "pens") && match.stage === "group") {
      return { ok: false, error: "That bet is knockouts only." };
    }

    const { error } = await supabase.rpc("save_side_bet", {
      p_match_id: input.matchId,
      p_market: input.market,
      p_pick: input.pick,
    });
    if (error) {
      if (error.code === "42501" || /row-level security/i.test(error.message)) {
        return { ok: false, error: "This match is locked — the deadline has passed." };
      }
      return { ok: false, error: error.message };
    }

    // ET and penalties are the two mutually-exclusive ways a tie ends beyond 90,
    // so you only ever back one. Once this one is saved, drop the opposite.
    if (input.market === "et" || input.market === "pens") {
      const other = input.market === "et" ? "pens" : "et";
      await supabase.rpc("clear_side_bet", { p_match_id: input.matchId, p_market: other });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath("/predictions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Remove a side bet before kickoff (changed their mind). The RPC itself guards
// the deadline; the path revalidation keeps the chips/controls fresh.
export async function clearSideBet(input: { matchId: number; market: SideBetMarket }): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (input.market !== "btts" && input.market !== "et" && input.market !== "pens") {
      return { ok: false, error: "Invalid market" };
    }
    const { error } = await supabase.rpc("clear_side_bet", {
      p_match_id: input.matchId,
      p_market: input.market,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard");
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath("/predictions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Joker / double-down ----------------
export async function saveJoker(input: { matchId: number }): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (!featuresLive()) return { ok: false, error: "The joker unlocks Monday." };

    const match = await getMatch(input.matchId);
    if (!match) return { ok: false, error: "Match not found" };
    if (isLocked(match.kickoff_at) || match.status !== "scheduled") {
      return { ok: false, error: "This match is locked — the deadline has passed." };
    }

    const { error } = await supabase.rpc("save_joker", { p_match_id: input.matchId });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath("/predictions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function clearJoker(input: { matchId: number }): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    const { error } = await supabase.rpc("clear_joker", { p_match_id: input.matchId });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard");
    revalidatePath(`/matches/${input.matchId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Group qualifier predictions ----------------
export async function saveGroupPrediction(input: {
  groupLabel: string;
  winnerId: number | null;
  runnerupId: number | null;
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    if (typeof input.groupLabel !== "string" || !/^[A-L]$/.test(input.groupLabel)) {
      return { ok: false, error: "Invalid group" };
    }
    if (input.winnerId != null && input.winnerId === input.runnerupId) {
      return { ok: false, error: "Winner and runner-up must be different teams." };
    }
    // Both picks must be teams that actually play in this group.
    const teams = await getTeams();
    const inGroup = (id: number | null) =>
      id == null || teams.some((t) => t.id === id && t.group_label === input.groupLabel);
    if (!inGroup(input.winnerId) || !inGroup(input.runnerupId)) {
      return { ok: false, error: "Pick teams from this group." };
    }
    const lockAt = await tournamentLockAt();
    if (lockAt && isLocked(lockAt)) {
      return { ok: false, error: "Group picks locked at the first kickoff." };
    }

    const { error } = await supabase.from("group_predictions").upsert(
      {
        user_id: userId,
        group_label: input.groupLabel,
        pred_winner_team_id: input.winnerId,
        pred_runnerup_team_id: input.runnerupId,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,group_label" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/groups");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Tournament predictions (golden boot etc.) ----------------
export async function saveTournamentPrediction(input: {
  type: "champion" | "finalist" | "golden_boot";
  teamId: number | null;
  textValue?: string | null;
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    if (!["champion", "finalist", "golden_boot"].includes(input.type)) {
      return { ok: false, error: "Invalid pick type" };
    }
    const lockAt = await tournamentLockAt();
    if (lockAt && isLocked(lockAt)) {
      return { ok: false, error: "Locked at the first kickoff." };
    }

    const text = typeof input.textValue === "string" ? input.textValue.trim().slice(0, 80) : null;

    // Golden Boot must be a real player from the squad list (when we have one) —
    // the picker enforces this in the UI, this enforces it against direct calls.
    if (input.type === "golden_boot" && text) {
      // Escape ilike wildcards so "%" can't match an arbitrary player.
      const pattern = text.replace(/[\\%_]/g, "\\$&");
      const { data: hit } = await supabase
        .from("players")
        .select("id")
        .ilike("name", pattern)
        .limit(1)
        .maybeSingle();
      if (!hit) {
        const { count } = await supabase
          .from("players")
          .select("id", { count: "exact", head: true });
        if ((count ?? 0) > 0) {
          return { ok: false, error: "Pick a player from the list." };
        }
      }
    }

    // Atomic single-pick-per-type write (unique (user_id, type) from migration
    // 0008) — the old delete-then-insert could race into duplicate picks.
    const { error } = await supabase.from("tournament_predictions").upsert(
      {
        user_id: userId,
        type: input.type,
        team_id: input.teamId,
        text_value: text,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,type" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tournament");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Podium (top-3) predictions ----------------
export async function savePodiumPick(input: {
  position: PodiumPosition;
  teamId: number | null;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (![1, 2, 3].includes(input.position)) return { ok: false, error: "Invalid position" };
    if (input.teamId != null && !isIntIn(input.teamId, 1, 100000)) {
      return { ok: false, error: "Invalid team" };
    }
    // All podium writes go through a SECURITY DEFINER function that enforces the
    // two-window rule and computes original/revised server-side. Users can't write
    // the table directly (migration 0004 revokes it), so the early/late value and
    // the "revised" flag can't be forged.
    const { error } = await supabase.rpc("save_podium_pick", {
      p_position: input.position,
      p_team_id: input.teamId,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/tournament");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Profile ----------------
// Show / hide the Google profile photo. When hidden, everyone (including the
// leaderboard view, server-side) sees initials instead.
export async function setAvatarHidden(hidden: boolean): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .update({ hide_avatar: !!hidden })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    updateTag(TAG_LEADERBOARD);
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateDisplayName(name: string): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const clean = String(name).replace(/\s+/g, " ").trim().slice(0, 40);
    if (!clean) return { ok: false, error: "Name cannot be empty" };
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    updateTag(TAG_LEADERBOARD);
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

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

    // Rescore every prediction for this match.
    const { data: preds } = await admin
      .from("predictions")
      .select("*")
      .eq("match_id", input.matchId);
    await inChunks((preds ?? []) as Prediction[], async (p) => {
      const pts = scorePrediction(p, updated as Match);
      await admin
        .from("predictions")
        .update({ points_awarded: pts, scored: true })
        .eq("id", p.id);
    });

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
