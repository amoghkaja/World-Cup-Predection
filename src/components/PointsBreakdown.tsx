import type { MyPointsBreakdown } from "@/lib/queries";

// Every source that feeds the leaderboard total, in display order. Kept here so
// the same split renders identically on a player's own pages and on the
// view-other-player page.
const SOURCES: { key: keyof MyPointsBreakdown; label: string; hint?: string; gamble?: boolean }[] = [
  { key: "matchPts", label: "Match picks", hint: "result & exact score" },
  { key: "groupPts", label: "Group stage", hint: "winner & runner-up" },
  { key: "podiumPts", label: "Podium", hint: "champion, runner-up & third" },
  { key: "goldenBootPts", label: "Golden Boot", hint: "top scorer's nation" },
  { key: "sidePts", label: "Side bets", hint: "yes-only long-shots", gamble: true },
  { key: "jokerPts", label: "Joker", hint: "double-or-nothing", gamble: true },
  { key: "streakPts", label: "Streak bonus", hint: "5 correct in a row" },
];

/**
 * A clear split of where a player's points came from. Only non-zero buckets
 * show; the header total is the sum of the shown buckets, so it always
 * reconciles. In the no-gambles view the side-bet/joker rows drop out and the
 * total falls to match the adjusted standing.
 */
export function PointsBreakdown({
  data,
  norisk = false,
  title,
}: {
  data: MyPointsBreakdown;
  norisk?: boolean;
  /** override the default "How the N points add up" heading */
  title?: string;
}) {
  const rows = SOURCES.map((s) => ({ ...s, pts: data[s.key] })).filter(
    (r) => r.pts !== 0 && !(norisk && r.gamble)
  );
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.pts, 0);

  return (
    <>
      <div className="t-label mb-2" style={{ color: "var(--text-3)" }}>
        {title ?? `How the ${total} points add up`}
      </div>
      <div className="card mb-4" style={{ overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center gap-3"
            style={{
              padding: "10px 16px",
              borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 650, fontSize: 14 }}>{r.label}</div>
              {r.hint && (
                <div className="t-xs" style={{ color: "var(--text-3)" }}>
                  {r.hint}
                </div>
              )}
            </div>
            <span
              className="tnum"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 16,
                color: r.pts < 0 ? "var(--bad)" : "var(--text)",
              }}
            >
              {r.pts > 0 ? "+" : ""}
              {r.pts}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
