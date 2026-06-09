import { redirect } from "next/navigation";
import { getProfile, getMatches, getTeams } from "@/lib/queries";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { AdminSettlePanel } from "@/components/AdminSettlePanel";

export const dynamic = "force-dynamic";

const ORDER: MatchStage[] = ["group", "r32", "r16", "qf", "sf", "final", "third"];

export default async function AdminResultsPage() {
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/dashboard");

  const [matches, teams] = await Promise.all([getMatches(), getTeams()]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Admin · results</h1>
        <p className="text-[var(--muted)] text-sm">
          Enter final scores to award points. For knockout ties, set the teams first, then the result
          (pick the advancer if drawn at 90&apos;).
        </p>
      </div>

      {ORDER.map((stage) => {
        const list = matches.filter((m) => m.stage === stage);
        if (list.length === 0) return null;
        return (
          <section key={stage} className="flex flex-col gap-2">
            <h2 className="font-bold text-[var(--accent)]">{STAGE_LABELS[stage]}</h2>
            {list.map((m) => (
              <AdminMatchRow key={m.id} match={m} teams={teams} />
            ))}
          </section>
        );
      })}

      <AdminSettlePanel teams={teams} />
    </div>
  );
}
