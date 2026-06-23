import type { Match, MatchDecidedIn, MatchStage, PredOutcome, Prediction } from "@/lib/types";

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
   Side bets · Joker · Streak (v3 add-ons)
   Opt-in gambles + engagement bonuses layered on top of the
   main pick. Main picks are unchanged (a wrong pick = 0).
   ============================================================ */

export type SideBetPick = "yes" | "no";

// --- Both teams to score. Win pays +3. The miss penalty is STAGE-SCALED: the
// group stage keeps the original lighter -2 (those bets were placed under that
// rule, so we never change them retroactively); knockouts (R32+) use the
// symmetric -3, which removes the small +EV edge a blind call had at -2.
export const BTTS_REWARD = 3;
export const BTTS_PENALTY = -3; // knockouts (R32+)
export const BTTS_PENALTY_GROUP = -2; // group stage (grandfathered)

export function actualBtts(home: number, away: number): "yes" | "no" {
  return home > 0 && away > 0 ? "yes" : "no";
}

/** The BTTS miss penalty for a stage: group -2, knockouts -3. */
export function bttsPenaltyFor(stage: MatchStage): number {
  return stage === "group" ? BTTS_PENALTY_GROUP : BTTS_PENALTY;
}

/** Points for one settled BTTS side bet, from the stored 90' score. */
export function scoreSideBet(
  pick: SideBetPick,
  home: number,
  away: number,
  stage: MatchStage
): number {
  return pick === actualBtts(home, away) ? BTTS_REWARD : bttsPenaltyFor(stage);
}

// --- Knockout-only side bets: "goes to extra time?" and "decided on penalties?".
// Settled purely from match.decided_in (clean + unambiguous). Payouts are
// ASYMMETRIC so the minority outcome ("yes") pays more and a blind/standing pick
// is ≤0 EV at the WC base rates (P(ET)≈0.30, P(pens)≈0.16): ET break-even p≈0.33,
// pens p≈0.17 — you must genuinely lean that way to profit.
export type KoMarket = "et" | "pens";

// "Goes to extra time?" / "Decided on penalties?" are OPT-IN long-shot bets — you
// only ever back the YES (the rarer, exciting outcome). There's deliberately no
// "no" side: a two-sided market on a ~16–30% event forces ugly lopsided odds (a
// +1 win that risks −6), so instead you simply don't place the bet if you reckon
// it won't happen. A win pays well; a miss is a small fixed cost. Tuned to ≤0 EV
// at WC base rates (ET≈30%, pens≈16%) so it can't be farmed, but reading a tight
// tie right is rewarded.
export const KO_SIDE_BET: Record<KoMarket, { win: number; miss: number }> = {
  et: { win: 4, miss: -2 }, // P(ET)≈0.30 → EV ≈ −0.2
  pens: { win: 5, miss: -1 }, // P(pens)≈0.16 → EV ≈ −0.04
};

export function actualEt(decidedIn: MatchDecidedIn | null | undefined): "yes" | "no" {
  return decidedIn === "extra_time" || decidedIn === "penalties" ? "yes" : "no";
}
export function actualPens(decidedIn: MatchDecidedIn | null | undefined): "yes" | "no" {
  return decidedIn === "penalties" ? "yes" : "no";
}

/**
 * Points for one settled knockout side bet. The bet is always "yes, it WILL go
 * to extra time / penalties", so it pays `win` when that happened and `miss`
 * otherwise.
 */
export function scoreKoSideBet(market: KoMarket, decidedIn: MatchDecidedIn | null | undefined): number {
  const happened = (market === "et" ? actualEt(decidedIn) : actualPens(decidedIn)) === "yes";
  const t = KO_SIDE_BET[market];
  return happened ? t.win : t.miss;
}

// --- Joker / double-down: doubles a correct main pick (pays its base points
// again — upside already scales with the bigger knockout points), or costs a
// stage-scaled penalty when the main pick is wrong. Relies on a wrong main pick
// scoring exactly 0. JOKER_WRONG_PENALTY is the base/group value, kept as a
// scalar for generic copy; JOKER_PENALTY_BY_STAGE is authoritative for scoring.
export const JOKER_WRONG_PENALTY = -4;

export const JOKER_PENALTY_BY_STAGE: Record<MatchStage, number> = {
  group: -4,
  r32: -4,
  r16: -5,
  qf: -6,
  sf: -7,
  third: -5,
  final: -8,
};

export function scoreJoker(mainPoints: number, stage: MatchStage): number {
  return mainPoints > 0 ? mainPoints : JOKER_PENALTY_BY_STAGE[stage];
}

// --- Streak: consecutive correct main results, in kickoff order (any wrong OR
// skipped eligible match resets the run to 0). Every time the run reaches a
// multiple of STREAK_TARGET — i.e. 5, 10, 15 in a row — that match earns the
// bonus. This is purely order-based: it never depends on which calendar day a
// match falls under, so it's fair across timezones (replaced the perfect-day
// bonus, which did depend on day grouping).
export const STREAK_TARGET = 5;
// Base reward (group level). The actual payout scales with the round the run
// lands on, so a streak sustained deep into the knockouts is worth much more.
export const STREAK_REWARD = 10;

export const STREAK_STAGE_MULT: Record<MatchStage, number> = {
  group: 1,
  r32: 1,
  r16: 1.5,
  qf: 2,
  sf: 2.5,
  third: 1.5,
  final: 3,
};

/**
 * Bonus when the run reaches a multiple of STREAK_TARGET, scaled by the stage of
 * the match that COMPLETES the run (deeper rounds come later, so the reward grows
 * as the tournament progresses): group/r32 +10, QF +20, final +30.
 */
export function streakBonusFor(streakLen: number, completingStage: MatchStage): number {
  if (!(streakLen > 0 && streakLen % STREAK_TARGET === 0)) return 0;
  return Math.round(STREAK_REWARD * STREAK_STAGE_MULT[completingStage]);
}

// --- Canonical league day for the "one joker per day" allowance: a single
// fixed zone so every player's joker resets on the same boundary regardless of
// their own timezone. MUST match the SQL tournament_day() function (migration
// 0011). Europe/Berlin (CEST) aligns the boundary with FEATURE_CUTOFF_ISO's
// midnight. (Scoring no longer depends on the day — the streak bonus replaced
// the perfect-matchday bonus precisely to avoid day-grouping unfairness.)
export const TOURNAMENT_DAY_TZ = "Europe/Berlin";

const TOURNAMENT_DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TOURNAMENT_DAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Canonical "YYYY-MM-DD" league day for a kickoff (matches SQL tournament_day). */
export function tournamentDay(iso: string): string {
  return TOURNAMENT_DAY_FMT.format(new Date(iso));
}

// --- Activation cutoff. The controls show on every open match immediately but
// stay LOCKED until this moment; after it, they're usable. It's also the point
// from which streak / settlement count. Authoritative gate is the
// SQL feature_cutoff(); this mirrors it for UI + pre-checks.
export const FEATURE_CUTOFF_ISO =
  process.env.NEXT_PUBLIC_FEATURE_CUTOFF ?? "2026-06-14T22:00:00Z"; // Mon 15 Jun 00:00 CEST

/** Have the new features unlocked yet (now ≥ cutoff)? Gates placing bets. */
export function featuresLive(now: number = Date.now()): boolean {
  return now >= new Date(FEATURE_CUTOFF_ISO).getTime();
}

/** Is a match within feature scope (kicks off at/after the cutoff)? For scoring. */
export function featuresActiveFor(kickoffIso: string): boolean {
  return new Date(kickoffIso).getTime() >= new Date(FEATURE_CUTOFF_ISO).getTime();
}
