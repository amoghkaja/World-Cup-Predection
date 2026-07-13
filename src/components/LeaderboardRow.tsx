import Link from "next/link";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { accuracyPct, STREAK_TARGET } from "@/lib/scoring";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";

// Medal disc for the top three, plain rank number for everyone else.
const MEDALS: Record<number, { bg: string; fg: string }> = {
  1: { bg: "var(--gold)", fg: "var(--on-gold)" },
  2: { bg: "oklch(0.8 0.012 250)", fg: "#2c3238" },
  3: { bg: "oklch(0.66 0.09 50)", fg: "#fff6ec" },
};

// One standings row. Highlights the current user.
export function LeaderboardRow({
  row,
  rank,
  me,
  last,
  streak = 0,
  delta = null,
}: {
  row: LeaderboardRowData;
  rank: number;
  me?: boolean;
  last?: boolean;
  // Current correct-result run; shown as a flame once it's a real streak (≥2).
  streak?: number;
  // Rank movement vs the day's start: positive = climbed, negative = dropped.
  delta?: number | null;
}) {
  const acc = accuracyPct(row);
  const medal = MEDALS[rank];
  // Hot once it's at/over the paying target (every STREAK_TARGET in a row).
  const streakHot = streak >= STREAK_TARGET;

  return (
    <Link
      href={`/u/${row.user_id}`}
      className={`flex items-center gap-3 press ${me ? "" : "rowh"}`}
      style={{
        padding: "11px 14px",
        background: me ? "var(--brand-soft)" : "transparent",
        borderTop: last === undefined ? undefined : "none",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{ width: 26, flex: "none", gap: 1 }}
      >
        {medal ? (
          <span
            className="tnum grid place-items-center"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: medal.bg,
              color: medal.fg,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 13.5,
            }}
          >
            {rank}
          </span>
        ) : (
          <span
            className="tnum"
            style={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--text-3)",
            }}
          >
            {rank}
          </span>
        )}
        {delta != null && delta !== 0 && (
          <span
            className="inline-flex items-center tnum"
            style={{
              gap: 1,
              fontSize: 9.5,
              fontWeight: 800,
              lineHeight: 1,
              color: delta > 0 ? "var(--good)" : "var(--bad)",
            }}
            title={delta > 0 ? `Up ${delta} since yesterday` : `Down ${-delta} since yesterday`}
          >
            {delta > 0 ? "▲" : "▼"}
            {Math.abs(delta)}
          </span>
        )}
      </div>
      <Avatar name={row.display_name ?? "?"} src={row.avatar_url} size={38} />
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontWeight: me ? 800 : 650, fontSize: 14.5 }}>
          {row.display_name ?? "Anonymous"}
          {me && (
            <span
              className="t-xs"
              style={{
                color: "var(--brand-strong)",
                marginLeft: 6,
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              YOU
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {streak >= 2 && (
            <span
              className="inline-flex items-center tnum"
              style={{
                gap: 2,
                fontSize: 11,
                fontWeight: 800,
                padding: "1px 6px 1px 4px",
                borderRadius: 999,
                background: streakHot ? "var(--gold-soft)" : "var(--surface-2)",
                color: streakHot ? "var(--gold-strong)" : "var(--text-2)",
              }}
              title={`${streak} correct in a row`}
            >
              <Icon
                name="flame"
                size={11}
                sw={2.2}
                style={{ color: streakHot ? "var(--gold-strong)" : "var(--flame, #e8763a)" }}
              />
              {streak}
            </span>
          )}
          <span className="t-xs tnum" style={{ color: "var(--text-3)" }}>
            {acc}% accuracy · {row.total_match_preds} picks
          </span>
        </div>
      </div>
      {/* desktop: animated accuracy bar */}
      <span className="hidden md:inline-flex items-center" style={{ gap: 7, width: 110, flex: "none" }}>
        <span
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: "var(--surface-2)",
            overflow: "hidden",
          }}
        >
          <span
            className="bar-anim"
            style={{
              display: "block",
              height: "100%",
              width: `${acc}%`,
              background: "var(--brand)",
              borderRadius: 2,
            }}
          />
        </span>
        <span className="t-xs tnum" style={{ color: "var(--text-2)", width: 32, textAlign: "right" }}>
          {acc}%
        </span>
      </span>

      <div className="tnum" style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {row.total_points}
        </div>
        <div className="t-xs" style={{ color: "var(--text-3)", marginTop: -2 }}>
          pts
        </div>
      </div>
    </Link>
  );
}
