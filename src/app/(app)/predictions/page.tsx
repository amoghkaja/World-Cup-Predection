import Link from "next/link";
import {
  getMatches,
  getMyPredictions,
  getMySideBets,
  getMyJokers,
  getMyPerfectDays,
} from "@/lib/queries";
import { zonedDayKey, zonedDayLabel } from "@/lib/format";
import { tournamentDay } from "@/lib/scoring";
import { getViewerTimeZone } from "@/lib/tz";
import type { MatchWithTeams, Prediction, SideBet } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { CompactPredictionRow } from "@/components/CompactPredictionRow";

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

  const [matches, preds, tz, sideBets, jokers, perfectDays] = await Promise.all([
    getMatches(),
    getMyPredictions(),
    getViewerTimeZone(),
    getMySideBets(),
    getMyJokers(),
    getMyPerfectDays(),
  ]);

  // Index side bets by match id for the per-row result chips.
  const sidesByMatch = new Map<number, SideBet[]>();
  for (const b of sideBets.values()) {
    (sidesByMatch.get(b.match_id) ?? sidesByMatch.set(b.match_id, []).get(b.match_id)!).push(b);
  }

  const mine = matches
    .filter((m) => preds.has(m.id))
    .map((m) => ({ match: m, pred: preds.get(m.id)! }))
    .sort((a, b) => b.match.kickoff_at.localeCompare(a.match.kickoff_at));

  const settled = mine.filter(({ match }) => isSettled(match));
  const earned = settled.reduce((s, { pred }) => s + pred.points_awarded, 0);
  const hits = settled.filter(({ pred }) => pred.points_awarded > 0).length;
  const pendingCount = mine.length - settled.length;

  const list = mine.filter(({ match }) => {
    if (tab === "settled") return isSettled(match);
    if (tab === "pending") return !isSettled(match);
    return true;
  });

  // Group by the viewer's local day, newest day first.
  const dayMap = new Map<string, { match: MatchWithTeams; pred: Prediction }[]>();
  for (const item of list) {
    const k = zonedDayKey(item.match.kickoff_at, tz);
    (dayMap.get(k) ?? dayMap.set(k, []).get(k)!).push(item);
  }
  const days = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const summary: { label: string; value: string | number; icon: string; gold?: boolean }[] = [
    { label: "Points banked", value: earned, icon: "bolt", gold: true },
    { label: "Correct results", value: `${hits}/${settled.length}`, icon: "target" },
    { label: "Pending picks", value: pendingCount, icon: "clock" },
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

      {days.map(([k, items]) => {
        const perfect = perfectDays.has(tournamentDay(items[0].match.kickoff_at));
        return (
          <div key={k} className="mb-[18px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="t-label" style={{ color: "var(--text-3)" }}>
                {zonedDayLabel(items[0].match.kickoff_at, tz)}
              </span>
              {perfect && (
                <span
                  className="pill"
                  style={{ background: "var(--gold-soft)", color: "var(--on-gold)", fontSize: 10.5 }}
                >
                  <Icon name="trophy" size={11} sw={2.4} />
                  Perfect day
                </span>
              )}
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {items.map((item, i) => (
                <CompactPredictionRow
                  key={item.match.id}
                  match={item.match}
                  pred={item.pred}
                  last={i === items.length - 1}
                  sideBets={sidesByMatch.get(item.match.id)}
                  joker={jokers.byMatch.get(item.match.id) ?? null}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
