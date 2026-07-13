import { redirect } from "next/navigation";
import { getProfile, getMatches, getTeams, getPlayers } from "@/lib/queries";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { AdminSettlePanel } from "@/components/AdminSettlePanel";

export const dynamic = "force-dynamic";

const ORDER: MatchStage[] = ["group", "r32", "r16", "qf", "sf", "final", "third"];

export default async function AdminResultsPage() {
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/dashboard");

  const [matches, teams, players] = await Promise.all([getMatches(), getTeams(), getPlayers()]);
  const now = Date.now();

  // The whole point of this page during the tournament: matches that have
  // kicked off but have no final result yet. Pin them on top (most recent
  // kickoff first) so score entry never means scrolling through 104 rows.
  const needsResult = matches
    .filter((m) => new Date(m.kickoff_at).getTime() <= now && m.status !== "final")
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
  const needsIds = new Set(needsResult.map((m) => m.id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Admin · results</h1>
        <p className="text-[var(--muted)] text-sm">
          Enter final scores to award points. For knockout ties, set the teams first, then the result
          (pick the advancer if drawn at 90&apos;).
        </p>
      </div>

      {needsResult.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold inline-flex items-center gap-2" style={{ color: "var(--bad)" }}>
            <span className="dot-live" />
            Needs a result ({needsResult.length})
          </h2>
          {needsResult.map((m) => (
            <AdminMatchRow key={m.id} match={m} teams={teams} />
          ))}
        </section>
      )}

      {ORDER.map((stage) => {
        const list = matches.filter((m) => m.stage === stage && !needsIds.has(m.id));
        if (list.length === 0) return null;
        // A stage with nothing actionable (all settled or all in the future
        // and far along) starts collapsed once every match in it is final.
        const allFinal = list.every((m) => m.status === "final");
        return (
          <details key={stage} open={!allFinal} className="flex flex-col gap-2">
            <summary
              className="font-bold cursor-pointer select-none"
              style={{ color: "var(--accent)", padding: "6px 0" }}
            >
              {STAGE_LABELS[stage]}
              <span className="t-xs" style={{ color: "var(--text-3)", marginLeft: 8 }}>
                {list.length} matches{allFinal ? " · all settled" : ""}
              </span>
            </summary>
            <div className="flex flex-col gap-2" style={{ marginTop: 6 }}>
              {list.map((m) => (
                <AdminMatchRow key={m.id} match={m} teams={teams} />
              ))}
            </div>
          </details>
        );
      })}

      <AdminSettlePanel teams={teams} players={players} />
    </div>
  );
}
