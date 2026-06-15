import { getCurrentUser, getLeaderboard, getCurrentStreaks } from "@/lib/queries";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { LeaderboardRow } from "@/components/LeaderboardRow";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [rows, user, streaks] = await Promise.all([
    getLeaderboard(),
    getCurrentUser(),
    getCurrentStreaks(),
  ]);
  const me = (r: LeaderboardRowData) => r.user_id === user?.id;
  const my = rows.find(me);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
      <div className="flex flex-wrap items-center justify-between mb-3" style={{ gap: 12 }}>
        <div>
          <h1 className="t-h1">Leaderboard</h1>
          <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
            {rows.length} {rows.length === 1 ? "player" : "players"} · tap anyone to see their
            locked picks
          </p>
        </div>
        {my && (
          <div className="card flex items-center" style={{ padding: "8px 14px", gap: 12 }}>
            <span className="t-label" style={{ color: "var(--text-3)" }}>
              You
            </span>
            <span
              className="tnum"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}
            >
              #{my.rank}
            </span>
            <span className="tnum t-sm" style={{ color: "var(--text-2)", fontWeight: 700 }}>
              {my.total_points} pts
            </span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
          <p className="t-sm" style={{ color: "var(--text-3)" }}>
            No players on the board yet.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {rows.map((r, i) => (
            <LeaderboardRow
              key={r.user_id}
              row={r}
              rank={r.rank}
              me={me(r)}
              last={i === rows.length - 1}
              streak={streaks[r.user_id] ?? 0}
            />
          ))}
        </div>
      )}

      <div className="t-xs text-center" style={{ color: "var(--text-3)", marginTop: 14 }}>
        Updates as results come in · every settled pick counts twice for accuracy: winner &amp; exact score
      </div>
    </div>
  );
}
