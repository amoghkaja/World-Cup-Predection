import {
  getCurrentUser,
  getLeaderboard,
  getCurrentStreaks,
  getBoardView,
  applyNoGambleView,
} from "@/lib/queries";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { BoardViewToggle } from "@/components/BoardViewToggle";
import { Trico } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [real, user, streaks, view] = await Promise.all([
    getLeaderboard(),
    getCurrentUser(),
    getCurrentStreaks(),
    getBoardView(),
  ]);
  const norisk = view === "norisk";
  const rows = norisk ? applyNoGambleView(real) : real;
  const me = (r: LeaderboardRowData) => r.user_id === user?.id;
  const my = rows.find(me);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
      <div className="flex flex-wrap items-center justify-between mb-3" style={{ gap: 12 }}>
        <div className="flex items-start" style={{ gap: 14 }}>
          <div>
            <h1 className="t-h1">Leaderboard</h1>
            <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
              {rows.length} {rows.length === 1 ? "player" : "players"} · tap anyone to see their
              locked picks
            </p>
          </div>
          <Trico style={{ marginTop: 10 }} />
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <BoardViewToggle view={view} />
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
      </div>

      {norisk && (
        <div
          className="card flex gap-3 items-start mb-3"
          style={{ padding: "13px 15px", background: "var(--gold-soft)", border: "1px solid var(--line)" }}
        >
          <span aria-hidden style={{ fontSize: 22, lineHeight: 1, flex: "none" }}>
            🙈
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--on-gold)" }}>
              Scaredy-cat standings
            </div>
            <div className="t-sm" style={{ color: "var(--text-2)", marginTop: 2 }}>
              {"Side-bet and joker points are hidden. This is "}
              <strong>not</strong>
              {" the real leaderboard — it’s a comfort view for players too scared to place a bet. The real board counts every gamble."}
            </div>
          </div>
        </div>
      )}

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
              delta={!norisk && r.prevRank != null ? r.prevRank - r.rank : null}
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
