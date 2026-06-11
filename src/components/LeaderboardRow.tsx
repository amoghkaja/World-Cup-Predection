import Link from "next/link";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

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
}: {
  row: LeaderboardRowData;
  rank: number;
  me?: boolean;
  last?: boolean;
}) {
  const acc =
    row.total_match_preds > 0
      ? Math.round((row.correct_matches / row.total_match_preds) * 100)
      : 0;
  const medal = MEDALS[rank];

  return (
    <Link
      href={me ? "/predictions" : `/u/${row.user_id}`}
      className="flex items-center gap-3 press"
      style={{
        padding: "11px 14px",
        background: me ? "var(--brand-soft)" : "transparent",
        borderTop: last === undefined ? undefined : "none",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      {medal ? (
        <span
          className="tnum grid place-items-center"
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            flex: "none",
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
            width: 26,
            textAlign: "center",
            flex: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-3)",
          }}
        >
          {rank}
        </span>
      )}
      <Avatar name={row.display_name ?? "?"} src={row.avatar_url} size={38} />
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontWeight: me ? 750 : 650, fontSize: 14.5 }}>
          {me ? "You" : row.display_name ?? "Anonymous"}
        </div>
        <div className="t-xs tnum" style={{ color: "var(--text-3)" }}>
          {acc}% accuracy · {row.total_match_preds} picks
        </div>
      </div>
      <div className="tnum" style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontStretch: "108%",
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
