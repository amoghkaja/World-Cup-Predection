import Link from "next/link";
import {
  getMatches,
  getMyPredictions,
  getMySideBets,
  getMyJokers,
  getMyPointsBreakdown,
  getBoardView,
} from "@/lib/queries";
import { zonedDayKey, zonedDayLabel } from "@/lib/format";
import { featuresActiveFor, streakProgression } from "@/lib/scoring";
import { getViewerTimeZone } from "@/lib/tz";
import type { MatchWithTeams, Prediction } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { CompactPredictionRow, MissedPickRow } from "@/components/CompactPredictionRow";
import { PointsBreakdown } from "@/components/PointsBreakdown";

export const dynamic = "force-dynamic";

type Tab = "all" | "settled" | "pending";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "settled", label: "Settled" },
  { key: "pending", label: "Pending" },
];

function isSettled(m: MatchWithTeams): boolean {
  return m.status === "final" && m.home_score != null && m.away_score != null;
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "settled" || tabParam === "pending" ? tabParam : "all";

  const [matches, preds, tz, sideBets, jokers, breakdown, view] = await Promise.all([
    getMatches(),
    getMyPredictions(),
    getViewerTimeZone(),
    getMySideBets(),
    getMyJokers(),
    getMyPointsBreakdown(),
    getBoardView(),
  ]);
  const norisk = view === "norisk";

  // Side bets are already grouped by match id (one list per match).
  const sidesByMatch = sideBets;

  const mine = matches
    .filter((m) => preds.has(m.id))
    .map((m) => ({ match: m, pred: preds.get(m.id)! }))
    .sort((a, b) => b.match.kickoff_at.localeCompare(a.match.kickoff_at));

  const settled = mine.filter(({ match }) => isSettled(match));
  const earned = settled.reduce((s, { pred }) => s + pred.points_awarded, 0);
  const hits = settled.filter(({ pred }) => pred.points_awarded > 0).length;
  const pendingCount = mine.length - settled.length;

  // Streak walk over EVERY in-scope settled match in kickoff order — including
  // ones this player skipped, because a skip resets the run just like a wrong
  // pick. This is the same walk the server's recomputeStreaks does, so each
  // row's flame matches the leaderboard badge. A match is "correct" when the
  // player's pick actually scored points.
  const settledChrono = matches
    .filter((m) => isSettled(m) && featuresActiveFor(m.kickoff_at))
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at) || a.id - b.id);
  const correctIds = new Set<number>();
  for (const m of settledChrono) {
    const p = preds.get(m.id);
    if (p?.scored && p.points_awarded > 0) correctIds.add(m.id);
  }
  const streakByMatch = streakProgression(settledChrono, correctIds);

  // Settled, in-scope matches the player never picked → "missed pick" rows, so
  // the history is complete and a skipped match (which breaks the streak) shows
  // up as the reason a run ended.
  const missed = settledChrono.filter((m) => !preds.has(m.id));
  const missedCount = missed.length;

  // Unified timeline: real picks (settled + pending) plus missed settled matches.
  type Row =
    | { kind: "pick"; match: MatchWithTeams; pred: Prediction }
    | { kind: "miss"; match: MatchWithTeams };
  const allRows: Row[] = [
    ...mine.map((x) => ({ kind: "pick" as const, match: x.match, pred: x.pred })),
    ...missed.map((m) => ({ kind: "miss" as const, match: m })),
  ];

  const list = allRows.filter((r) => {
    if (tab === "settled") return isSettled(r.match);
    if (tab === "pending") return r.kind === "pick" && !isSettled(r.match);
    return true;
  });

  // Group by the viewer's local day, newest day first (and newest match first
  // within a day, so picks and any missed matches interleave chronologically).
  const dayMap = new Map<string, Row[]>();
  for (const r of list) {
    const k = zonedDayKey(r.match.kickoff_at, tz);
    (dayMap.get(k) ?? dayMap.set(k, []).get(k)!).push(r);
  }
  for (const rows of dayMap.values()) {
    rows.sort(
      (a, b) =>
        b.match.kickoff_at.localeCompare(a.match.kickoff_at) || b.match.id - a.match.id
    );
  }
  const days = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const summary: { label: string; value: string | number; icon: string; gold?: boolean }[] = [
    { label: "Match points", value: earned, icon: "bolt", gold: true },
    { label: "Correct results", value: `${hits}/${settled.length}`, icon: "target" },
    { label: pendingCount > 0 ? "Pending picks" : "Missed picks", value: pendingCount > 0 ? pendingCount : missedCount, icon: pendingCount > 0 ? "clock" : "minus" },
  ];

  return (
    <div className="flex flex-col">
      <div className="mb-3">
        <h1 className="t-h1">My Predictions</h1>
        <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
          Your full pick history, points earned, and pending calls.
        </p>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {summary.map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
            <div
              className="flex items-center gap-2 mb-2"
              style={{ color: s.gold ? "var(--gold-strong)" : "var(--text-3)" }}
            >
              <Icon name={s.icon} size={16} />
              <span className="t-label">{s.label}</span>
            </div>
            <div
              className="tnum"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 28,
                color: s.gold ? "var(--gold-strong)" : "var(--text)",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* full points split — match picks are only one of several sources */}
      <PointsBreakdown data={breakdown} norisk={norisk} title="Where all your points come from" />

      {/* filter (server-rendered segmented via query param) */}
      <div className="seg mb-4 self-start">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/predictions" : `/predictions?tab=${t.key}`}
            className={`seg-btn ${tab === t.key ? "on" : ""}`}
            scroll={false}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {days.length === 0 && (
        <div
          className="card flex flex-col items-center text-center gap-2"
          style={{ padding: "40px 20px" }}
        >
          <div
            className="grid place-items-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--surface-2)",
              color: "var(--text-3)",
            }}
          >
            <Icon name="list" size={24} />
          </div>
          <div className="t-h3">No predictions yet</div>
          <p className="t-sm" style={{ color: "var(--text-3)", maxWidth: 320 }}>
            Head to the dashboard and lock in your first calls before kickoff.
          </p>
          <Link href="/dashboard" className="btn btn-primary mt-1" style={{ padding: "10px 18px" }}>
            Go to dashboard
          </Link>
        </div>
      )}

      {days.map(([k, rows]) => (
        <div key={k} className="mb-[18px]">
          <div className="t-label mb-2" style={{ color: "var(--text-3)" }}>
            {zonedDayLabel(rows[0].match.kickoff_at, tz)}
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {rows.map((r, i) =>
              r.kind === "pick" ? (
                <CompactPredictionRow
                  key={`p-${r.match.id}`}
                  match={r.match}
                  pred={r.pred}
                  last={i === rows.length - 1}
                  sideBets={sidesByMatch.get(r.match.id)}
                  joker={jokers.byMatch.get(r.match.id) ?? null}
                  streak={streakByMatch.get(r.match.id)}
                />
              ) : (
                <MissedPickRow
                  key={`m-${r.match.id}`}
                  match={r.match}
                  last={i === rows.length - 1}
                  streak={streakByMatch.get(r.match.id)}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
