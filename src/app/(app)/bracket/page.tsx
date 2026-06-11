import { getMatches, getMyPredictions } from "@/lib/queries";
import { STAGE_LABELS, type MatchStage, type MatchWithTeams } from "@/lib/types";
import { BracketNode } from "@/components/BracketNode";
import { Icon } from "@/components/Icon";

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
  const columns = KO_ORDER.filter((s) => byStage.has(s));

  // Champion column: the winner of the final, if settled.
  const final = byStage.get("final")?.[0] ?? null;
  const champion =
    final && final.status === "final" && final.winner_team_id != null
      ? final.winner_team_id === final.home_team_id
        ? final.home_team
        : final.winner_team_id === final.away_team_id
          ? final.away_team
          : null
      : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-h1">Knockout bracket</h1>
          <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 4 }}>
            Tap a tie to predict the scoreline. Scroll right to build all the way to the final.
          </p>
        </div>
        <span
          className="chip"
          style={{ background: champion ? "var(--gold-soft)" : "var(--surface-2)" }}
        >
          <Icon name="trophy" size={15} style={{ color: "var(--gold-strong)" }} />
          {champion ? (
            <span className="inline-flex items-center gap-1.5">
              <span>{champion.flag_emoji}</span>
              {champion.name}
            </span>
          ) : (
            <span style={{ color: "var(--text-3)" }}>No champion yet</span>
          )}
        </span>
      </header>

      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-stretch" style={{ gap: 22, minWidth: "min-content" }}>
          {columns.map((stage) => {
            const list = byStage.get(stage)!;
            return (
              <section
                key={stage}
                className="flex flex-col shrink-0"
                style={{ width: 200, minWidth: 200 }}
              >
                <div
                  className="t-label sticky top-0 text-center"
                  style={{ color: "var(--text-3)", marginBottom: 12 }}
                >
                  {STAGE_LABELS[stage]}
                </div>
                <div className="flex flex-col flex-1 justify-around" style={{ gap: 14 }}>
                  {list.map((m) => (
                    <BracketNode key={m.id} match={m} predicted={preds.has(m.id)} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Champion column */}
          <section
            className="flex flex-col shrink-0 justify-center"
            style={{ width: 184, minWidth: 184 }}
          >
            <div
              className="t-label text-center"
              style={{ color: "var(--gold-strong)", marginBottom: 12 }}
            >
              Champion
            </div>
            <div
              className="card text-center"
              style={{
                padding: 18,
                background: champion ? "var(--gold-soft)" : "var(--surface)",
                border: champion ? "1px solid var(--gold)" : "1px dashed var(--line-strong)",
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 6 }}>
                {champion ? champion.flag_emoji : "🏆"}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  color: champion ? "var(--on-gold)" : "var(--text-3)",
                }}
              >
                {champion ? champion.name : "Build your bracket"}
              </div>
              {champion && (
                <div
                  className="t-xs"
                  style={{ color: "var(--on-gold)", opacity: 0.8, marginTop: 4 }}
                >
                  World champions
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
