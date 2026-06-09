import Link from "next/link";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

// One standings row. Highlights the current user with a brand-soft pill.
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

  return (
    <Link
      href={me ? "/predictions" : `/u/${row.user_id}`}
      className="flex items-center gap-3 press"
      style={{
        padding: "12px 16px",
        background: me ? "var(--brand-soft)" : "transparent",
        borderRadius: me ? 14 : 0,
        border: me ? "1px solid var(--brand-ring)" : "1px solid transparent",
        borderBottom: me ? undefined : last ? "1px solid transparent" : "1px solid var(--line)",
      }}
    >
      <span
        className="tnum"
        style={{
          width: 26,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 17,
          color: rank <= 3 ? "var(--gold-strong)" : "var(--text-3)",
        }}
      >
        {rank}
      </span>
      <Avatar name={row.display_name ?? "?"} src={row.avatar_url} size={40} />
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{ fontWeight: 800, fontSize: 15 }}
        >
          {me ? "You" : row.display_name ?? "Anonymous"}
        </div>
        <div className="t-xs tnum" style={{ color: "var(--text-3)" }}>
          {acc}% accuracy · {row.total_match_preds} picks
        </div>
      </div>
      <div className="tnum" style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
          {row.total_points}
        </div>
        <div className="t-xs" style={{ color: "var(--text-3)", marginTop: -1 }}>
          pts
        </div>
      </div>
    </Link>
  );
}
