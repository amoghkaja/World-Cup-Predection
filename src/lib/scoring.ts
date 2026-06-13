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
 * Leaderboard accuracy. Every settled pick is two predictions — the result and
 * the exact score — so accuracy = component hits / (2 × settled picks): getting
 * only the winner right drops you to 50% for that match. Falls back to the old
 * result-only formula until the view exposes correct_scores (migration 0009).
 */
export function accuracyPct(row: {
  correct_matches: number;
  total_match_preds: number;
  correct_scores?: number | null;
}): number {
  if (row.total_match_preds === 0) return 0;
  if (row.correct_scores == null) {
    return Math.round((row.correct_matches / row.total_match_preds) * 100);
  }
  return Math.round(
    ((row.correct_matches + row.correct_scores) / (2 * row.total_match_preds)) * 100
  );
}

/**
 * Podium points for one position (1, 2 or 3): the early value if correct & not revised,
 * the late value if correct & revised, otherwise 0.
 */
export function scorePodium(position: number, correct: boolean, revised: boolean): number {
  if (!correct) return 0;
  return (revised ? PODIUM_LATE : PODIUM_EARLY)[position - 1] ?? 0;
}

/* ============================================================
   Side bets · Joker · Streak · Perfect matchday (v3 add-ons)
   Opt-in gambles + engagement bonuses layered on top of the
   main pick. Main picks are unchanged (a wrong pick = 0).
   ============================================================ */

export type SideBetMarket = "btts" | "ou";
export type SideBetPick = "yes" | "no" | "over" | "under";

// --- Both teams to score: a true ~50/50, so a flat (slightly inviting) payout.
export const BTTS_REWARD = 3;
export const BTTS_PENALTY = -2;

export function actualBtts(home: number, away: number): "yes" | "no" {
  return home > 0 && away > 0 ? "yes" : "no";
}

// --- Over/Under: the player picks the half-line AND the side. The payout scales
// with the odds so a near-certain line ("over 0.5") can't be farmed: it pays a
// trickle on a win but costs a lot on the rare miss.
export const OU_MIN_LINE = 0.5;
export const OU_MAX_LINE = 6.5;
export const OU_K = 6;

// Rough P(total goals > n) for a World Cup match (Poisson λ≈2.6, hand-tuned).
const P_OVER: Record<number, number> = {
  0: 0.94, 1: 0.8, 2: 0.57, 3: 0.35, 4: 0.18, 5: 0.08, 6: 0.04,
};

/** Estimated win probability of an over/under bet at a given half-line. */
export function ouWinProbability(pick: "over" | "under", line: number): number {
  const n = Math.max(0, Math.min(6, Math.floor(line)));
  const pOver = P_OVER[n] ?? 0.02;
  return pick === "over" ? pOver : 1 - pOver;
}

/** A valid O/U line is a half-line (x.5) inside the allowed band. */
export function isValidOuLine(line: number): boolean {
  return (
    Number.isFinite(line) &&
    line >= OU_MIN_LINE &&
    line <= OU_MAX_LINE &&
    Math.round(line * 2) % 2 === 1 // odd half-integer ⇒ x.5
  );
}

/** What a winning / losing O/U bet at this line is worth (for display + scoring). */
export function ouPayout(pick: "over" | "under", line: number): { win: number; loss: number } {
  const p = ouWinProbability(pick, line);
  return {
    win: Math.max(1, Math.round(OU_K * (1 - p))),
    loss: -Math.max(1, Math.round(OU_K * p)),
  };
}

function scoreOverUnder(pick: "over" | "under", line: number, home: number, away: number): number {
  const total = home + away;
  if (total === line) return 0; // push (only on a whole-number line; UI uses half-lines)
  const won = pick === "over" ? total > line : total < line;
  const { win, loss } = ouPayout(pick, line);
  return won ? win : loss;
}

/** Points for one settled side bet, from the stored full-time score. */
export function scoreSideBet(
  market: SideBetMarket,
  pick: SideBetPick,
  line: number | null,
  home: number,
  away: number
): number {
  if (market === "btts") {
    return pick === actualBtts(home, away) ? BTTS_REWARD : BTTS_PENALTY;
  }
  return scoreOverUnder(pick === "under" ? "under" : "over", line ?? 2.5, home, away);
}

// --- Joker / double-down: doubles a correct main pick (pays its base points
// again), or costs a flat penalty when the main pick is wrong. Relies on a
// wrong main pick scoring exactly 0.
export const JOKER_WRONG_PENALTY = -4;

export function scoreJoker(mainPoints: number): number {
  return mainPoints > 0 ? mainPoints : JOKER_WRONG_PENALTY;
}

// --- Streak: consecutive correct main results (any wrong OR skipped eligible
// match resets it). Bonus awarded on the match that extends the run to length n.
export const STREAK_BONUS = [0, 0, 1, 2, 3, 5]; // index = run length − 1, clamp to last

export function streakBonusFor(streakLen: number): number {
  if (streakLen <= 0) return 0;
  return STREAK_BONUS[Math.min(streakLen, STREAK_BONUS.length) - 1];
}

// --- Perfect matchday: all of a day's picks correct, and you must have picked
// every eligible match that day (min 2).
export const PERFECT_DAY_MIN_PICKS = 2;
export const PERFECT_DAY_BASE = 5;
export const PERFECT_DAY_PER_MATCH = 2;

export function perfectDayBonus(correctPicks: number): number {
  if (correctPicks < PERFECT_DAY_MIN_PICKS) return 0;
  return PERFECT_DAY_BASE + PERFECT_DAY_PER_MATCH * correctPicks;
}

// --- Activation cutoff: side bets & joker are offered only for matches kicking
// off at/after this (set to the first kickoff once every team has played once).
// Authoritative gate is the SQL feature_cutoff(); this is for UI/pre-checks.
export const FEATURE_CUTOFF_ISO =
  process.env.NEXT_PUBLIC_FEATURE_CUTOFF ?? "2026-06-18T16:00:00Z";

export function featuresActiveFor(kickoffIso: string): boolean {
  return new Date(kickoffIso).getTime() >= new Date(FEATURE_CUTOFF_ISO).getTime();
}
