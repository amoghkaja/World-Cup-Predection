import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries";
import type { LeaderboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const [{ data }, user] = await Promise.all([
    supabase.from("leaderboard").select("*").order("total_points", { ascending: false }),
    getCurrentUser(),
  ]);
  const rows = (data ?? []) as LeaderboardRow[];

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Leaderboard</h1>

      {rows.length === 0 && <p className="text-[var(--muted)]">No players yet.</p>}

      <div className="flex flex-col gap-1">
        {rows.map((r, i) => {
          const me = r.user_id === user?.id;
          const acc =
            r.total_match_preds > 0
              ? Math.round((r.correct_matches / r.total_match_preds) * 100)
              : null;
          return (
            <div
              key={r.user_id}
              className="card p-3 flex items-center gap-3"
              style={me ? { borderColor: "var(--primary)" } : undefined}
            >
              <span className="w-8 text-center text-lg font-bold tabular-nums">{medal(i)}</span>
              {r.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar_url} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-[var(--surface-2)] grid place-items-center">
                  {(r.display_name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {r.display_name ?? "Anonymous"} {me && <span className="text-[var(--muted)] text-xs">(you)</span>}
                </div>
                {acc !== null && (
                  <div className="text-xs text-[var(--muted)]">{acc}% accuracy · {r.correct_matches} correct</div>
                )}
              </div>
              <span className="text-xl font-extrabold" style={{ color: "var(--accent)" }}>
                {r.total_points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
