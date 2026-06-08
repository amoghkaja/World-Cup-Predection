import type { Match, MatchStage, PredOutcome, Prediction } from "@/lib/types";

/**
 * Scoring model: tiered by round + an early-bird time multiplier.
 *
 *   points = round(base_points * time_multiplier)
 *
 * base_points = (correct outcome points for the stage)
 *             + (exact score bonus for the stage, if the exact score matched)
 *
 * The time multiplier rewards predicting earlier (riskier — no late team news).
 */

export const OUTCOME_POINTS: Record<MatchStage, number> = {
  group: 3,
  r32: 4,
  r16: 5,
  qf: 7,
  sf: 10,
  third: 6,
  final: 15,
};

export const EXACT_BONUS: Record<MatchStage, number> = {
  group: 3,
  r32: 4,
  r16: 5,
  qf: 6,
  sf: 8,
  third: 6,
  final: 12,
};

// Special predictions
export const GROUP_QUALIFIER_POINTS = 4; // per correct team (winner / runner-up)
export const CHAMPION_POINTS = 30;
export const FINALIST_POINTS = 10;
export const GOLDEN_BOOT_POINTS = 15;

/** Time-multiplier tiers, evaluated from most-early to least-early. */
export const TIME_TIERS: { minHours: number; multiplier: number; label: string }[] = [
  { minHours: 168, multiplier: 1.5, label: "7+ days early" },
  { minHours: 72, multiplier: 1.3, label: "3–7 days early" },
  { minHours: 24, multiplier: 1.15, label: "1–3 days early" },
  { minHours: 0, multiplier: 1.0, label: "<24h before" },
];

export function timeMultiplier(submittedAt: Date | string, kickoffAt: Date | string): number {
  return timeTier(submittedAt, kickoffAt).multiplier;
}

export function timeTier(submittedAt: Date | string, kickoffAt: Date | string) {
  const submitted = new Date(submittedAt).getTime();
  const kickoff = new Date(kickoffAt).getTime();
  const hoursEarly = (kickoff - submitted) / 36e5;
  for (const tier of TIME_TIERS) {
    if (hoursEarly >= tier.minHours) return tier;
  }
  return TIME_TIERS[TIME_TIERS.length - 1];
}

/** The actual result of a finished match from the home team's perspective. */
export function actualOutcome(home: number, away: number): PredOutcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * The outcome a prediction is scored against. For group games this is the 90' result.
 * For knockout games a draw still has an advancer, so we use winner_team_id when set.
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

/**
 * Compute points for a single match prediction against a finished match.
 * Returns 0 if the match isn't final.
 */
export function scorePrediction(pred: Prediction, match: Match): number {
  const actual = actualOutcomeForMatch(match);
  if (actual == null) return 0;
  if (pred.pred_outcome !== actual) return 0; // wrong outcome → no points

  let base = OUTCOME_POINTS[match.stage];
  const exact =
    pred.pred_home_score === match.home_score && pred.pred_away_score === match.away_score;
  if (exact) base += EXACT_BONUS[match.stage];

  const mult = timeMultiplier(pred.submitted_at, match.kickoff_at);
  return Math.round(base * mult);
}

/** Max points obtainable for a match (exact score, predicted as early as possible). */
export function maxPointsForStage(stage: MatchStage): number {
  return Math.round((OUTCOME_POINTS[stage] + EXACT_BONUS[stage]) * TIME_TIERS[0].multiplier);
}
