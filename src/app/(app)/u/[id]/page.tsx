import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getLeaderboard } from "@/lib/queries";
import type { MatchWithTeams, Prediction, Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { CompactPredictionRow } from "@/components/CompactPredictionRow";

export const dynamic = "force-dynamic";

// Embed the prediction's match (+ both teams). RLS only returns predictions for
// matches that have already kicked off when viewing someone else, so this page
// can only ever show locked picks.
const SELECT =
  "*, match:matches!match_id(*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*))";

type Row = Prediction & { match: MatchWithTeams | null };

export default async function UserPicksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me?.id === id) redirect("/predictions");

  const supabase = await createClient();
  const [{ data: prof }, lb, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    getLeaderboard(),
    supabase.from("predictions").select(SELECT).eq("user_id", id),
  ]);
  if (!prof) notFound();
  const profile = prof as Profile;

  const mine = lb.find((r) => r.user_id === id);
  const rank = mine?.rank ?? null;
  const points = mine?.total_points ?? 0;

  const items = ((rows ?? []) as unknown as Row[])
    .filter((p) => p.match)
    .sort((a, b) => b.match!.kickoff_at.localeCompare(a.match!.kickoff_at));

  const firstName = (profile.display_name ?? "this player").split(" ")[0];

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
      <Link
        href="/leaderboard"
        className="t-sm inline-flex items-center gap-1"
        style={{ color: "var(--text-3)", marginBottom: 12 }}
      >
        <Icon name="chevL" size={15} /> Leaderboard
      </Link>

      <div className="card flex items-center gap-3.5 mb-4" style={{ padding: "16px 18px" }}>
        <Avatar
          name={profile.display_name ?? "?"}
          src={profile.hide_avatar ? null : profile.avatar_url}
          size={56}
        />
        <div className="flex-1 min-w-0">
          <h1 className="t-h2 truncate">{profile.display_name ?? "Player"}</h1>
          <div className="t-sm" style={{ color: "var(--text-3)" }}>
            {points} pts{rank ? ` · Rank #${rank}` : ""}
          </div>
        </div>
      </div>

      <div className="t-label mb-2" style={{ color: "var(--text-3)" }}>
        Their picks · locked matches only
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
          <p className="t-sm" style={{ color: "var(--text-3)" }}>
            Nothing to show yet — you&rsquo;ll see {firstName}&rsquo;s predictions once those matches
            kick off.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {items.map((p, i) => (
            <CompactPredictionRow
              key={p.id}
              match={p.match as MatchWithTeams}
              pred={p}
              last={i === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
