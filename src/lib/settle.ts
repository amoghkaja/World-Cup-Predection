import { createAdminClient } from "@/lib/supabase/server";
import {
  FEATURE_CUTOFF_ISO,
  featuresActiveFor,
  scoreSideBet,
  scoreJoker,
  streakBonusFor,
  type SideBetPick,
} from "@/lib/scoring";
import type { Match } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

async function inChunks<T>(items: T[], fn: (item: T) => Promise<unknown>, size = 20) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

/**
 * Local, per-match settlement: score side bets and resolve any joker for the
 * match. Called from both settlement paths AFTER the main predictions for the
 * match have been re-scored (the joker reads predictions.points_awarded).
 */
export async function settleMatchSideEffects(admin: Admin, match: Match): Promise<void> {
  if (!featuresActiveFor(match.kickoff_at)) return;
  if (match.home_score == null || match.away_score == null) return;
  const home = match.home_score;
  const away = match.away_score;

  // --- side bets ---
  const { data: bets } = await admin.from("side_bets").select("*").eq("match_id", match.id);
  await inChunks(bets ?? [], async (b) => {
    const pts = scoreSideBet(b.pick as SideBetPick, home, away);
    await admin.from("side_bets").update({ points_awarded: pts, scored: true }).eq("id", b.id);
  });

  // --- joker(s) on this match ---
  const { data: jokers } = await admin.from("joker_picks").select("*").eq("match_id", match.id);
  if (jokers && jokers.length > 0) {
    const { data: preds } = await admin
      .from("predictions")
      .select("user_id, points_awarded")
      .eq("match_id", match.id);
    const mainPts = new Map<string, number>();
    (preds ?? []).forEach((p) => mainPts.set(p.user_id, p.points_awarded));
    await inChunks(jokers, async (j) => {
      const pts = scoreJoker(mainPts.get(j.user_id) ?? 0);
      await admin.from("joker_picks").update({ points_awarded: pts, scored: true }).eq("id", j.id);
    });
  }
}

/**
 * Global derived bonus (streak). Run ONCE after a batch of matches settles — not
 * per match — so a single sync doesn't recompute every user's history N times.
 * Streak resets on a wrong pick OR a skipped eligible match, and pays every time
 * the run hits a multiple of STREAK_TARGET (5 in a row). Purely order-based — no
 * calendar-day grouping, so it's timezone-fair.
 */
export async function recomputeStreaks(admin: Admin): Promise<void> {
  // Eligible settled matches in chronological order.
  const { data: matchRows } = await admin
    .from("matches")
    .select("id, kickoff_at, home_score, away_score, status")
    .gte("kickoff_at", FEATURE_CUTOFF_ISO)
    .order("kickoff_at")
    .order("id");
  const settled = (matchRows ?? []).filter(
    (m) => m.status === "final" && m.home_score != null && m.away_score != null
  );
  if (settled.length === 0) {
    // Nothing eligible settled yet — clear any stale rows and stop.
    await admin.from("streak_bonuses").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    return;
  }
  const settledIds = settled.map((m) => m.id);

  // All main picks on those matches: who got each one right.
  const { data: preds } = await admin
    .from("predictions")
    .select("user_id, match_id, points_awarded, scored")
    .in("match_id", settledIds);
  const correct = new Map<string, Set<number>>(); // user -> set of matchIds they got right
  const picked = new Map<string, Set<number>>(); // user -> set of matchIds they picked (settled)
  for (const p of preds ?? []) {
    if (!picked.has(p.user_id)) picked.set(p.user_id, new Set());
    picked.get(p.user_id)!.add(p.match_id);
    if (p.scored && p.points_awarded > 0) {
      if (!correct.has(p.user_id)) correct.set(p.user_id, new Set());
      correct.get(p.user_id)!.add(p.match_id);
    }
  }
  const users = [...picked.keys()];

  // --- streaks: walk settled matches in order; correct extends, wrong/skip resets ---
  const streakRows: { user_id: string; match_id: number; streak_len: number; points_awarded: number }[] = [];
  for (const u of users) {
    const right = correct.get(u) ?? new Set<number>();
    let run = 0;
    for (const m of settled) {
      if (right.has(m.id)) {
        run += 1;
        const pts = streakBonusFor(run);
        streakRows.push({ user_id: u, match_id: m.id, streak_len: run, points_awarded: pts });
      } else {
        run = 0; // wrong pick or didn't pick this settled match
      }
    }
  }

  // Rebuild the table (small at friends-league scale; idempotent).
  const ZERO = "00000000-0000-0000-0000-000000000000";
  await admin.from("streak_bonuses").delete().neq("user_id", ZERO);
  if (streakRows.length) await admin.from("streak_bonuses").insert(streakRows);
}
