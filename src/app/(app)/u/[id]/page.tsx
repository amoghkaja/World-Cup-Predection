import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getLeaderboard, getTeams, podiumWindows } from "@/lib/queries";
import type {
  GroupPrediction,
  MatchWithTeams,
  PodiumPrediction,
  Prediction,
  Profile,
  Team,
  TournamentPrediction,
} from "@/lib/types";
import { isLocked } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Flag } from "@/components/TeamBadge";
import { CompactPredictionRow } from "@/components/CompactPredictionRow";

export const dynamic = "force-dynamic";

// Embed the prediction's match (+ both teams). RLS only returns predictions for
// matches that have already kicked off when viewing someone else, so this page
// can only ever show locked picks.
const SELECT =
  "*, match:matches!match_id(*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*))";

type Row = Prediction & { match: MatchWithTeams | null };

const PODIUM_LABELS: { position: number; label: string }[] = [
  { position: 1, label: "Champion" },
  { position: 2, label: "Runner-up" },
  { position: 3, label: "Third place" },
];

export default async function UserPicksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me?.id === id) redirect("/predictions");

  const supabase = await createClient();
  // RLS hides other users' tournament/group/podium picks until their lock
  // passes, so the extra queries simply come back empty before then.
  const [{ data: prof }, lb, { data: rows }, { data: podium }, { data: tourn }, { data: groups }, teams, windows] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      getLeaderboard(),
      supabase.from("predictions").select(SELECT).eq("user_id", id),
      supabase.from("podium_predictions").select("*").eq("user_id", id).order("position"),
      supabase.from("tournament_predictions").select("*").eq("user_id", id),
      supabase.from("group_predictions").select("*").eq("user_id", id).order("group_label"),
      getTeams(),
      podiumWindows(),
    ]);
  if (!prof) notFound();
  const profile = prof as Profile;

  const teamById = new Map<number, Team>(teams.map((t) => [t.id, t]));
  const podiumPicks = (podium ?? []) as PodiumPrediction[];
  const goldenBoot =
    ((tourn ?? []) as TournamentPrediction[]).find((t) => t.type === "golden_boot")?.text_value ??
    null;
  const groupPicks = ((groups ?? []) as GroupPrediction[]).filter(
    (g) => g.pred_winner_team_id != null || g.pred_runnerup_team_id != null
  );
  const tournamentLocked = windows.firstKickoff != null && isLocked(windows.firstKickoff);
  // Podium picks stay revisable (and therefore RLS-hidden to others) until the
  // first knockout match — golden boot & group picks unlock at first kickoff.
  const podiumRevealed = windows.firstR32Kickoff != null && isLocked(windows.firstR32Kickoff);
  const hasCalls = podiumPicks.length > 0 || goldenBoot != null || groupPicks.length > 0;

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
        Tournament calls
      </div>
      <div className="card mb-4" style={{ padding: "14px 18px" }}>
        {!tournamentLocked ? (
          <p className="t-sm flex items-center gap-2" style={{ color: "var(--text-3)" }}>
            <Icon name="lock" size={15} /> Hidden until the tournament kicks off.
          </p>
        ) : podiumRevealed && !hasCalls ? (
          <p className="t-sm" style={{ color: "var(--text-3)" }}>
            {firstName} didn&rsquo;t lock in any pre-tournament picks.
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {!podiumRevealed && (
              <p className="t-sm flex items-center gap-2" style={{ color: "var(--text-3)" }}>
                <Icon name="lock" size={15} style={{ flex: "none" }} />
                Champion, runner-up &amp; third place stay hidden until the knockouts begin —
                podium picks can still be revised after the group stage.
              </p>
            )}
            {podiumRevealed &&
              PODIUM_LABELS.map(({ position, label }) => {
              const team = teamById.get(
                podiumPicks.find((p) => p.position === position)?.team_id ?? -1
              );
              return (
                <div key={position} className="flex items-center gap-2">
                  <span className="t-sm" style={{ color: "var(--text-3)", width: 92, flex: "none" }}>
                    {label}
                  </span>
                  {team ? (
                    <span className="flex items-center gap-1.5" style={{ fontWeight: 700, fontSize: 14 }}>
                      <Flag flag={team.flag_emoji} name={team.name} size="sm" /> {team.name}
                    </span>
                  ) : (
                    <span className="t-sm" style={{ color: "var(--text-3)" }}>—</span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-2">
              <span className="t-sm" style={{ color: "var(--text-3)", width: 92, flex: "none" }}>
                Golden Boot
              </span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{goldenBoot ?? <span className="t-sm" style={{ color: "var(--text-3)", fontWeight: 400 }}>—</span>}</span>
            </div>
            {groupPicks.length > 0 && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <div className="t-xs mb-1.5" style={{ color: "var(--text-3)" }}>
                  Group picks · winner & runner-up
                </div>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {groupPicks.map((g) => {
                    const w = teamById.get(g.pred_winner_team_id ?? -1);
                    const r = teamById.get(g.pred_runnerup_team_id ?? -1);
                    return (
                      <span
                        key={g.group_label}
                        className="pill tnum"
                        style={{ background: "var(--surface-2)", fontSize: 11.5, padding: "4px 9px", gap: 4 }}
                      >
                        <strong>{g.group_label}</strong>
                        <Flag flag={w?.flag_emoji} name={w?.name} size="sm" /> {w?.code ?? "—"}
                        <span style={{ color: "var(--text-3)" }}>·</span>
                        <Flag flag={r?.flag_emoji} name={r?.name} size="sm" /> {r?.code ?? "—"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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
              ownerName={firstName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
