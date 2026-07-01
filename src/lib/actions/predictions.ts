"use server";

import { revalidatePath } from "next/cache";
import { getMatch } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { actualOutcome } from "@/lib/scoring";
import type { PredOutcome } from "@/lib/types";
import {
  type Result,
  LOCKED_MSG,
  requireUser,
  isIntIn,
  isRlsDenied,
  revalidateMatchSurfaces,
} from "./shared";

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
      return { ok: false, error: LOCKED_MSG };
    }

    // Derive the outcome from the scoreline so the pair can never disagree.
    // A level knockout still needs the player's advancer call.
    const fromScore = actualOutcome(home, away);
    let outcome: PredOutcome;
    if (fromScore !== "draw") outcome = fromScore;
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
      if (isRlsDenied(error)) return { ok: false, error: LOCKED_MSG };
      return { ok: false, error: error.message };
    }

    revalidatePath("/bracket");
    revalidateMatchSurfaces(input.matchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
