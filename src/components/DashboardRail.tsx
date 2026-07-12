import Link from "next/link";
import { Avatar } from "./Avatar";
import { Trico } from "./Logo";

export type RailRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  rank: number;
};

/** Last settled picks, oldest → newest. true = correct result. */
export type FormChip = boolean;

// Desktop-only right rail: top-5 standings + your recent form.
export function DashboardRail({
  top,
  myId,
  form,
  streak,
}: {
  top: RailRow[];
  myId: string | null;
  form: FormChip[];
  streak: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      <Link href="/leaderboard" className="card lift block" style={{ overflow: "hidden" }}>
        <div className="card-h">
          <span className="t-label" style={{ color: "var(--text-2)" }}>
            Standings
          </span>
          <Trico />
        </div>
        {top.length === 0 ? (
          <p className="t-sm" style={{ color: "var(--text-3)", padding: "14px 16px" }}>
            No players on the board yet.
          </p>
        ) : (
          top.map((u, i) => {
            const me = u.user_id === myId;
            return (
              <div
                key={u.user_id}
                className="grid items-center rowh"
                style={{
                  gridTemplateColumns: "22px 30px 1fr auto",
                  gap: 10,
                  padding: "9px 16px",
                  borderTop: i ? "1px solid var(--line)" : "none",
                  background: me ? "var(--brand-soft)" : undefined,
                }}
              >
                <span
                  className="tnum text-center"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--text-2)" }}
                >
                  {u.rank}
                </span>
                <Avatar name={u.display_name} src={u.avatar_url} size={26} />
                <span
                  className="t-sm truncate"
                  style={{ fontWeight: me ? 800 : 600 }}
                >
                  {me ? "You" : u.display_name ?? "Anonymous"}
                </span>
                <span className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>
                  {u.total_points}
                </span>
              </div>
            );
          })
        )}
      </Link>

      {form.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <span className="t-label" style={{ color: "var(--text-2)" }}>
            Your form
          </span>
          <div className="flex stagger" style={{ gap: 6, marginTop: 10 }}>
            {form.map((ok, i) => (
              <span
                key={i}
                className="gtag"
                style={{
                  ["--i" as string]: i,
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: ok ? "var(--green)" : "var(--red)",
                  color: ok ? "var(--on-good)" : "var(--on-bad)",
                  fontSize: 11,
                }}
              >
                {ok ? "W" : "L"}
              </span>
            ))}
          </div>
          <div className="t-xs" style={{ color: "var(--text-3)", marginTop: 10 }}>
            {streak > 0
              ? `${streak}-pick streak — keep it rolling`
              : "Last settled picks, oldest to newest"}
          </div>
        </div>
      )}
    </div>
  );
}
