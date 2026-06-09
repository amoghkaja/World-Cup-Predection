"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  scorePrediction,
  scorePodium,
  GROUP_QUALIFIER_POINTS,
  GOLDEN_BOOT_POINTS,
} from "@/lib/scoring";
import type { Match, PodiumPosition, PredOutcome, Prediction } from "@/lib/types";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) throw new Error("Admin only");
  return { user };
}

// ---------------- Match predictions ----------------
export async function savePrediction(input: {
  matchId: number;
  outcome: PredOutcome;
  homeScore: number;
  awayScore: number;
}): Promise<Result> {
  try {
    const { supabase, user } = await requireUser();

    const home = Math.max(0, Math.min(20, Math.round(input.homeScore)));
    const away = Math.max(0, Math.min(20, Math.round(input.awayScore)));
    if (!["home", "away", "draw"].includes(input.outcome)) {
      return { ok: false, error: "Invalid outcome" };
    }

    // Deadline check (RLS is the backstop, this gives a friendly error).
    const { data: match } = await supabase
      .from("matches")
      .select("kickoff_at, home_team_id, away_team_id")
      .eq("id", input.matchId)
      .single();
    if (!match) return { ok: false, error: "Match not found" };
    if (new Date(match.kickoff_at).getTime() <= Date.now()) {
      return { ok: false, error: "This match is locked — the deadline has passed." };
    }

    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: user.id,
        match_id: input.matchId,
        pred_home_score: home,
        pred_away_score: away,
        pred_outcome: input.outcome,
        submitted_at: new Date().toISOString(),
        points_awarded: 0,
        scored: false,
      },
      { onConflict: "user_id,match_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath("/bracket");
    revalidatePath(`/matches/${input.matchId}`);
    revalidatePath("/predictions");
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
    const { supabase, user } = await requireUser();
    if (input.winnerId && input.winnerId === input.runnerupId) {
      return { ok: false, error: "Winner and runner-up must be different teams." };
    }
    const { error } = await supabase.from("group_predictions").upsert(
      {
        user_id: user.id,
        group_label: input.groupLabel,
        pred_winner_team_id: input.winnerId,
        pred_runnerup_team_id: input.runnerupId,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,group_label" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/groups");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Tournament predictions (champion etc.) ----------------
export async function saveTournamentPrediction(input: {
  type: "champion" | "finalist" | "golden_boot";
  teamId: number | null;
  textValue?: string | null;
}): Promise<Result> {
  try {
    const { supabase, user } = await requireUser();
    // single champion pick: clear previous of same type first
    await supabase
      .from("tournament_predictions")
      .delete()
      .eq("user_id", user.id)
      .eq("type", input.type);

    const { error } = await supabase.from("tournament_predictions").insert({
      user_id: user.id,
      type: input.type,
      team_id: input.teamId,
      text_value: input.textValue ?? null,
      submitted_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tournament");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Profile ----------------
export async function updateDisplayName(name: string): Promise<Result> {
  try {
    const { supabase, user } = await requireUser();
    const clean = name.trim().slice(0, 40);
    if (!clean) return { ok: false, error: "Name cannot be empty" };
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Admin: enter result & rescore ----------------
export async function saveMatchResult(input: {
  matchId: number;
  homeScore: number;
  awayScore: number;
  winnerTeamId: number | null; // advancer for knockout draws
}): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const home = Math.max(0, Math.round(input.homeScore));
    const away = Math.max(0, Math.round(input.awayScore));

    const { data: updated, error: upErr } = await admin
      .from("matches")
      .update({
        home_score: home,
        away_score: away,
        winner_team_id: input.winnerTeamId,
        status: "final",
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
    for (const p of (preds ?? []) as Prediction[]) {
      const pts = scorePrediction(p, updated as Match);
      await admin
        .from("predictions")
        .update({ points_awarded: pts, scored: true })
        .eq("id", p.id);
    }

    // When the Final or 3rd-place game is settled, re-derive and score the podium.
    const settledStage = (updated as Match).stage;
    if (settledStage === "final" || settledStage === "third") {
      await settlePodiumWith(admin);
    }

    revalidatePath("/leaderboard");
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
    const { error } = await admin
      .from("matches")
      .update({ home_team_id: input.homeTeamId, away_team_id: input.awayTeamId })
      .eq("id", input.matchId);
    if (error) return { ok: false, error: error.message };
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
    const admin = createAdminClient();
    const { data: preds } = await admin
      .from("group_predictions")
      .select("*")
      .eq("group_label", input.groupLabel);
    for (const p of preds ?? []) {
      let pts = 0;
      if (p.pred_winner_team_id === input.winnerId) pts += GROUP_QUALIFIER_POINTS;
      if (p.pred_runnerup_team_id === input.runnerupId) pts += GROUP_QUALIFIER_POINTS;
      await admin
        .from("group_predictions")
        .update({ points_awarded: pts, scored: true })
        .eq("id", p.id);
    }
    revalidatePath("/leaderboard");
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
    const { supabase, user } = await requireUser();

    // Which window are we in? (pre-group sets the "original"; post-group is a revision.)
    const [{ data: firstRow }, { data: lastGroupRow }, { data: r32Row }] = await Promise.all([
      supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
      supabase
        .from("matches")
        .select("kickoff_at")
        .eq("stage", "group")
        .order("kickoff_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("matches")
        .select("kickoff_at")
        .eq("stage", "r32")
        .order("kickoff_at")
        .limit(1)
        .maybeSingle(),
    ]);
    const now = Date.now();
    const first = firstRow ? new Date(firstRow.kickoff_at).getTime() : Infinity;
    const lastGroup = lastGroupRow ? new Date(lastGroupRow.kickoff_at).getTime() : Infinity;
    const r32 = r32Row ? new Date(r32Row.kickoff_at).getTime() : Infinity;
    const inWindow1 = now < first;
    const inWindow2 = now >= lastGroup && now < r32;
    if (!inWindow1 && !inWindow2) {
      return {
        ok: false,
        error:
          now < lastGroup
            ? "Podium picks are locked during the group stage."
            : "Podium picks are locked.",
      };
    }

    const { data: existing } = await supabase
      .from("podium_predictions")
      .select("*")
      .eq("user_id", user.id)
      .eq("position", input.position)
      .maybeSingle();

    const original = inWindow1 ? input.teamId : existing?.original_team_id ?? null;
    const revised = inWindow2 && input.teamId !== (existing?.original_team_id ?? null);

    const { error } = await supabase.from("podium_predictions").upsert(
      {
        user_id: user.id,
        position: input.position,
        team_id: input.teamId,
        original_team_id: original,
        revised,
        submitted_at: new Date().toISOString(),
        points_awarded: 0,
        scored: false,
      },
      { onConflict: "user_id,position" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/tournament");
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
  for (const p of preds ?? []) {
    const want = actual[p.position];
    const correct = want != null && p.team_id === want;
    const pts = scorePodium(p.position, correct, p.revised);
    await admin
      .from("podium_predictions")
      .update({ points_awarded: pts, scored: true })
      .eq("id", p.id);
  }
}

export async function settlePodium(): Promise<Result> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    await settlePodiumWith(admin);
    revalidatePath("/leaderboard");
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
    const target = name.trim().toLowerCase();
    const { data: preds } = await admin
      .from("tournament_predictions")
      .select("*")
      .eq("type", "golden_boot");
    for (const p of preds ?? []) {
      const hit = !!target && (p.text_value ?? "").trim().toLowerCase() === target;
      await admin
        .from("tournament_predictions")
        .update({ points_awarded: hit ? GOLDEN_BOOT_POINTS : 0, scored: true })
        .eq("id", p.id);
    }
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
