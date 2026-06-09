import type { Match, MatchStage, PredOutcome, Prediction } from "@/lib/types";

/**
 * Scoring model (v2): round-weighted match points + exact-score bonus — NO time multiplier.
 *
 *   points = OUTCOME_POINTS[stage]                         (correct result)
 *          + EXACT_BONUS[stage]  (only if the exact score is also right)
 *
 * Podium (top-3) and group/Golden-Boot bonuses are awarded separately.
 * All values live here — tune freely.
 */

export const OUTCOME_POINTS: Record<MatchStage, number> = {
  group: 3,
  r32: 4,
  r16: 5,
  qf: 6,
  sf: 8,
  third: 5,
  final: 9,
};

// Added on top of OUTCOME_POINTS when the exact scoreline is correct
// (so exact totals are: group 5, r32 6, r16 8, qf 10, sf 13, third 8, final 15).
export const EXACT_BONUS: Record<MatchStage, number> = {
  group: 2,
  r32: 2,
  r16: 3,
  qf: 4,
  sf: 5,
  third: 3,
  final: 6,
};

// Podium (top-3) per-position value. EARLY = set before the group stage and left unchanged;
// LATE = revised in the post-group window. Index 0 = 1st, 1 = 2nd, 2 = 3rd.
export const PODIUM_EARLY = [15, 12, 10];
export const PODIUM_LATE = [12, 10, 8];

export const GROUP_QUALIFIER_POINTS = 4; // per correct team (winner / runner-up)
export const GOLDEN_BOOT_POINTS = 15;

/** The actual result of a finished match from the home team's perspective. */
export function actualOutcome(home: number, away: number): PredOutcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * The outcome a prediction is scored against. Group games use the 90' result; a level
 * knockout still has an advancer, so we use winner_team_id when set.
 */
export function actualOutcomeForMatch(match: Match): PredOutcome | null {
  if (match.status !== "final" || match.home_score == null || match.away_score == null) {
    return null;
  }
  if (match.stage !== "group" && match.winner_team_id != null) {
    if (match.winner_team_id === match.home_team_id) return "home";
    if (match.winner_team_id === match.away_team_id) return "away";
  }
  return actualOutcome(match.home_score, match.away_score);
}

/** Points for a single match prediction against a finished match (0 if not final). */
export function scorePrediction(pred: Prediction, match: Match): number {
  const actual = actualOutcomeForMatch(match);
  if (actual == null) return 0;
  if (pred.pred_outcome !== actual) return 0; // wrong outcome → no points
  let base = OUTCOME_POINTS[match.stage];
  const exact =
    pred.pred_home_score === match.home_score && pred.pred_away_score === match.away_score;
  if (exact) base += EXACT_BONUS[match.stage];
  return base;
}

/** Max points obtainable for a match (exact score). */
export function maxPointsForStage(stage: MatchStage): number {
  return OUTCOME_POINTS[stage] + EXACT_BONUS[stage];
}

/**
 * Podium points for one position (1, 2 or 3): the early value if correct & not revised,
 * the late value if correct & revised, otherwise 0.
 */
export function scorePodium(position: number, correct: boolean, revised: boolean): number {
  if (!correct) return 0;
  return (revised ? PODIUM_LATE : PODIUM_EARLY)[position - 1] ?? 0;
}
