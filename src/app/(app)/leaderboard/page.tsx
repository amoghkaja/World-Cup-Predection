import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries";
import type { LeaderboardRow as LeaderboardRowData } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { LeaderboardRow } from "@/components/LeaderboardRow";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const [{ data }, user] = await Promise.all([
    supabase.from("leaderboard").select("*").order("total_points", { ascending: false }),
    getCurrentUser(),
  ]);
  const rows = (data ?? []) as LeaderboardRowData[];
  const me = (r: LeaderboardRowData) => r.user_id === user?.id;

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Display order: 2nd, 1st, 3rd.
  const podiumOrder = [
    { row: podium[1], place: 2 },
    { row: podium[0], place: 1 },
    { row: podium[2], place: 3 },
  ].filter((p) => p.row);

  const firstName = (r: LeaderboardRowData) => (r.display_name ?? "Player").split(" ")[0];

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
      <div className="mb-3">
        <h1 className="t-h1">Leaderboard</h1>
        <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
          Friends league · {rows.length} {rows.length === 1 ? "player" : "players"}
        </p>
      </div>

      {rows.length === 0 && (
        <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
          <p className="t-sm" style={{ color: "var(--text-3)" }}>
            No players on the board yet.
          </p>
        </div>
      )}

      {/* podium */}
      {podiumOrder.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 items-end mb-[18px]">
          {podiumOrder.map(({ row, place }, i) => {
            const h = place === 1 ? 132 : place === 2 ? 104 : 88;
            const medal =
              place === 1
                ? "var(--gold)"
                : place === 2
                  ? "oklch(0.78 0.01 250)"
                  : "oklch(0.66 0.09 50)";
            return (
              <Link
                key={row.user_id}
                href={me(row) ? "/predictions" : `/u/${row.user_id}`}
                className="anim-up flex flex-col items-center"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="relative mb-2.5">
                  <Avatar
                    name={row.display_name ?? "?"}
                    src={row.avatar_url}
                    size={place === 1 ? 64 : 52}
                    ring={place === 1 ? "var(--gold)" : undefined}
                  />
                  <span
                    className="grid place-items-center"
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -6,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: medal,
                      color: "#3a2c00",
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: "var(--font-display)",
                      border: "2px solid var(--surface)",
                    }}
                  >
                    {place}
                  </span>
                </div>
                <div
                  className="truncate text-center"
                  style={{ fontWeight: 800, fontSize: 14, maxWidth: 110 }}
                >
                  {me(row) ? "You" : firstName(row)}
                </div>
                <div
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 20,
                    color: "var(--gold-strong)",
                  }}
                >
                  {row.total_points}
                </div>
                <div
                  className="grid w-full mt-2"
                  style={{
                    height: h,
                    borderRadius: "14px 14px 0 0",
                    background: place === 1 ? "var(--brand)" : "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderBottom: "none",
                    placeItems: "start center",
                    paddingTop: 12,
                  }}
                >
                  <Icon
                    name={place === 1 ? "trophy" : "medal"}
                    size={place === 1 ? 26 : 20}
                    style={{ color: place === 1 ? "var(--gold)" : "var(--text-3)" }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* full list */}
      {rest.length > 0 && (
        <div className="card" style={{ overflow: "hidden", padding: 6 }}>
          {rest.map((r, i) => (
            <LeaderboardRow
              key={r.user_id}
              row={r}
              rank={i + 4}
              me={me(r)}
              last={i === rest.length - 1}
            />
          ))}
        </div>
      )}

      <div
        className="t-xs text-center"
        style={{ color: "var(--text-3)", marginTop: 14 }}
      >
        Updated live as results come in · Accuracy = correct outcomes ÷ settled picks
      </div>
    </div>
  );
}
