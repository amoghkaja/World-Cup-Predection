# Scoring redesign — agreed spec (to implement)

**Status:** designed & approved, not yet built. Implement after (a) the free results-API
research is done and (b) the Claude design handoff lands. Nothing in this doc is coded yet —
the live app still uses the old model in `src/lib/scoring.ts`.

## Why
The original model (tiered base points by round + an early-bird *time* multiplier, plus a
single Champion/Golden-Boot pick) is being replaced with a simpler, more engaging system:
flat-ish match points weighted by round, no time multiplier, and a new **podium (top-3)**
prediction with an early-commitment mechanic.

## Decisions (locked)
- **Match points:** round-weighted, **no time multiplier**. *exact / correct-outcome:*

  | Round | Exact | Outcome |
  |---|--:|--:|
  | Group | 5 | 3 |
  | R32 | 6 | 4 |
  | R16 | 8 | 5 |
  | QF | 10 | 6 |
  | SF | 13 | 8 |
  | 3rd place | 8 | 5 |
  | Final | 15 | 9 |

  Wrong outcome = 0. Knockout **outcome = correct advancer**; **exact = 90' score**
  (matches existing `actualOutcomeForMatch`). Values are a single tunable table.

- **Podium (top-3), exact slot only.** Predict 1st (champion), 2nd (losing finalist),
  3rd (3rd-place playoff winner). Per-position value depends on when last set:
  - **Early** (set before the group stage & left unchanged): 1st **15**, 2nd **12**, 3rd **10**
  - **Late** (revised after the group stage): 1st **12**, 2nd **10**, 3rd **8**
  - Points only if the team finishes in that **exact** slot (no partial credit).
  - **Two locked windows:** Window 1 = now → first match kickoff (sets the "original").
    Locked during the group stage. Window 2 = after the last group match → first knockout
    (R32) kickoff (one revision). Locked after R32 kickoff.
  - Actual podium **auto-derived** from the Final (winner=1st, loser=2nd) + the
    3rd-place match (winner=3rd) — no separate admin step.

- **Kept:** per-group winner/runner-up picks (+4 each), Golden Boot (+15, admin-settled).
  Also **fix**: Golden Boot is currently never awarded — add settlement for it.
- **Removed:** the early-bird time multiplier, and the old single Champion (+30) /
  Finalist (+10) picks (replaced by the podium).

## Implementation plan (files)
1. **`src/lib/scoring.ts`** — replace `OUTCOME_POINTS`/`EXACT_BONUS` with the new
   `OUTCOME_POINTS`/`EXACT_POINTS` tables; delete `TIME_TIERS`/`timeMultiplier`/`timeTier`
   and `CHAMPION_POINTS`/`FINALIST_POINTS`; rewrite `scorePrediction` (exact→`EXACT_POINTS`,
   outcome→`OUTCOME_POINTS`, else 0, no multiplier); `maxPointsForStage` → `EXACT_POINTS`.
   Add `PODIUM_EARLY=[15,12,10]`, `PODIUM_LATE=[12,10,8]`, and `scorePodium(position, correct, revised)`.
2. **`supabase/migrations/0003_scoring_redesign.sql`** (NEW — user runs in Supabase):
   create `podium_predictions(user_id, position 1|2|3, team_id, original_team_id, revised,
   points_awarded, scored, unique(user_id,position))` + RLS (write only before R32 kickoff;
   read own anytime / others after lock). `create or replace view leaderboard` to also sum
   `podium_predictions.points_awarded`. Keep `tournament_predictions` for golden_boot only.
3. **`src/lib/types.ts`** — add `PodiumPrediction` + `PodiumPosition`; trim `TournamentPredType`.
4. **`src/lib/queries.ts`** — `getMyPodiumPredictions`; `podiumWindows()` returning the three
   boundary times (first kickoff, last group kickoff, first R32 kickoff).
5. **`src/app/actions.ts`** — `savePodiumPick(position, teamId)` (window logic: window 1 sets
   `original_team_id`; window 2 sets `team_id`, `revised = team_id != original_team_id`; reject
   when locked); `settlePodium()` (auto-derive from Final + 3rd-place, score via `scorePodium`);
   `settleGoldenBoot(name)` (NEW, +15 to matching text); hook podium settle into
   `saveMatchResult` when the Final/3rd-place match goes final; retire `settleTournament`
   champion/finalist. `scorePrediction` callsite unchanged (no longer uses the multiplier).
6. **`src/components/TournamentPicker.tsx`** + **`src/app/(app)/tournament/page.tsx`** — rework
   into a Podium picker (1st/2nd/3rd selectors, current window + values, revised/locked state)
   plus the existing Golden Boot section. Rename nav "Champion" → "Podium".
7. **`src/components/PredictionForm.tsx`** + **`src/app/(app)/predictions/page.tsx`** — remove
   `timeTier`/multiplier chips; show the round-weighted 5/3 hint.
8. **`src/app/(app)/scoring/page.tsx`** — rewrite to the new model (round-weighted table,
   podium two-window values, group qualifier, golden boot); drop the early-bird section/example.
9. **`src/app/(app)/admin/results/page.tsx`** (+ AdminMatchRow) — add a Golden Boot settle
   control; podium auto-derives (optionally surface the derived podium).
10. **`README.md`** — update the scoring section.

## Verify (after building)
- `npm run lint` clean; restart dev (Node 20) and load `/scoring`, `/tournament`, `/predictions`.
- Run `0003_scoring_redesign.sql` in Supabase; confirm `podium_predictions` + updated
  `leaderboard` view exist.
- Settle a fake Final + 3rd-place match in `/admin/results`; confirm podium + match points
  score correctly and the leaderboard totals include them.
