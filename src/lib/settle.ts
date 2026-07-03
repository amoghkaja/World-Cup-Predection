import { createAdminClient } from "@/lib/supabase/server";
import {
  FEATURE_CUTOFF_ISO,
  featuresActiveFor,
  scorePrediction,
  scoreSideBet,
  scoreKoSideBet,
  scoreJoker,
  streakBonusFor,
  tournamentDay,
  type SideBetPick,
  type KoMarket,
} from "@/lib/scoring";
import { inChunks } from "@/lib/batch";
import { rankBoard } from "@/lib/rank";
import type { Match, Prediction } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Re-score every main prediction for a finished match. Shared by both
 * settlement entry points (admin saveMatchResult and the results sync) so the
 * loops can't drift apart. Run BEFORE settleMatchSideEffects — the joker reads
 * the freshly written predictions.points_awarded.
 */
export async function rescoreMatchPredictions(admin: Admin, match: Match): Promise<void> {
  const { data: preds } = await admin.from("predictions").select("*").eq("match_id", match.id);
  await inChunks((preds ?? []) as Prediction[], async (p) => {
    const pts = scorePrediction(p, match);
    await admin
      .from("predictions")
      .update({ points_awarded: pts, scored: true })
      .eq("id", p.id);
  });
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

  // --- side bets (BTTS on any match; ET/pens on knockouts) ---
  const { data: bets } = await admin.from("side_bets").select("*").eq("match_id", match.id);
  await inChunks(bets ?? [], async (b) => {
    let pts: number;
    if (b.market === "et" || b.market === "pens") {
      // ET/pens settle from how the tie was decided — wait if that hasn't landed yet
      // (e.g. the feed marked it final before regularTime/duration arrived).
      if (match.decided_in == null) return;
      pts = scoreKoSideBet(b.market as KoMarket, match.decided_in);
    } else {
      pts = scoreSideBet(b.pick as SideBetPick, home, away, match.stage);
    }
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
      const pts = scoreJoker(mainPts.get(j.user_id) ?? 0, match.stage);
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
    .select("id, kickoff_at, home_score, away_score, status, stage")
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

  // All main picks on those matches: who got each one right. Read in PAGES — an
  // un-limited Supabase select returns at most 1000 rows, so once the league
  // passed 1000 settled-match predictions the newest ones were silently dropped
  // and the rebuild never saw recent correct picks (it broke streaks for everyone).
  // Page through them all so nothing is missed — ORDERED BY the primary key so the
  // pages are a stable, gap-free partition. Without an explicit ORDER BY,
  // LIMIT/OFFSET paging is undefined in Postgres: consecutive pages can overlap
  // OR skip rows, and a skipped *correct* pick silently breaks that player's
  // streak (they stop hitting the 5/10/15 milestones).
  type PredRow = { user_id: string; match_id: number; points_awarded: number; scored: boolean };
  const preds: PredRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("predictions")
      .select("user_id, match_id, points_awarded, scored")
      .in("match_id", settledIds)
      .order("id")
      .range(from, from + 999);
    const batch = (data ?? []) as PredRow[];
    preds.push(...batch);
    if (batch.length < 1000) break;
  }
  const correct = new Map<string, Set<number>>(); // user -> set of matchIds they got right
  const picked = new Map<string, Set<number>>(); // user -> set of matchIds they picked (settled)
  for (const p of preds) {
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
        const pts = streakBonusFor(run, m.stage);
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

/**
 * Capture each player's current rank ONCE per tournament (Berlin) day, so the
 * leaderboard can show movement arrows (today's rank vs this snapshot). Safe to
 * call every sync — it no-ops if a snapshot already exists for today. Best-effort:
 * if the table isn't there yet (migration 0015 not run) it silently does nothing.
 */
export async function captureDailyRankSnapshot(admin: Admin): Promise<void> {
  try {
    const { data: latest } = await admin
      .from("rank_snapshots")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // Same canonical league day as the joker allowance (Europe/Berlin).
    const today = tournamentDay(new Date().toISOString());
    if (latest && tournamentDay((latest as { captured_at: string }).captured_at) === today) {
      return; // already captured today
    }

    const { data } = await admin
      .from("leaderboard")
      .select("user_id, total_points, correct_matches, display_name");
    const rows = (data ?? []) as {
      user_id: string;
      total_points: number;
      correct_matches: number;
      display_name: string | null;
    }[];
    if (rows.length === 0) return;

    const snap = rankBoard(rows).map((r) => ({
      user_id: r.user_id,
      rank: r.rank,
      captured_at: new Date().toISOString(),
    }));

    const ZERO = "00000000-0000-0000-0000-000000000000";
    await admin.from("rank_snapshots").delete().neq("user_id", ZERO);
    await admin.from("rank_snapshots").insert(snap);
  } catch {
    // table missing or transient error — movement arrows are best-effort
  }
}
