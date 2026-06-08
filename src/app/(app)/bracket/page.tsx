import { getMatches, getMyPredictions } from "@/lib/queries";
import { STAGE_LABELS, type MatchStage, type MatchWithTeams } from "@/lib/types";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

const KO_ORDER: MatchStage[] = ["r32", "r16", "qf", "sf", "final", "third"];

export default async function BracketPage() {
  const [matches, preds] = await Promise.all([getMatches(), getMyPredictions()]);
  const byStage = new Map<MatchStage, MatchWithTeams[]>();
  for (const m of matches) {
    if (m.stage === "group") continue;
    if (!byStage.has(m.stage)) byStage.set(m.stage, []);
    byStage.get(m.stage)!.push(m);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Knockout bracket</h1>
        <p className="text-[var(--muted)] text-sm">
          Predict each knockout tie. Matches unlock once the teams are confirmed.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KO_ORDER.filter((s) => byStage.has(s)).map((stage) => (
          <section key={stage} className="shrink-0 w-72 flex flex-col gap-3">
            <h2 className="font-bold text-[var(--accent)] sticky top-0">
              {STAGE_LABELS[stage]}
            </h2>
            {byStage.get(stage)!.map((m) => (
              <MatchCard key={m.id} match={m} prediction={preds.get(m.id) ?? null} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
