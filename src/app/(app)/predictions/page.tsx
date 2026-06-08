import Link from "next/link";
import { getMatches, getMyPredictions } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { timeTier } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const [matches, preds] = await Promise.all([getMatches(), getMyPredictions()]);
  const rows = matches
    .filter((m) => preds.has(m.id))
    .map((m) => ({ match: m, pred: preds.get(m.id)! }));

  const total = rows.reduce((s, r) => s + r.pred.points_awarded, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My predictions</h1>
        <span className="chip" style={{ color: "var(--accent)" }}>
          {total} pts from matches
        </span>
      </div>

      {rows.length === 0 && (
        <p className="text-[var(--muted)]">
          You haven&apos;t predicted anything yet. <Link href="/dashboard" className="underline">Start picking →</Link>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ match, pred }) => {
          const tier = timeTier(pred.submitted_at, match.kickoff_at);
          const correct = pred.scored && pred.points_awarded > 0;
          return (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="card p-3 flex items-center justify-between gap-3 hover:border-[var(--primary)]"
            >
              <div className="min-w-0">
                <div className="text-xs text-[var(--accent)]">
                  {STAGE_LABELS[match.stage]}
                  {match.group_label ? ` · Group ${match.group_label}` : ""}
                </div>
                <div className="font-semibold truncate">
                  {match.home_team?.flag_emoji} {match.home_team?.code ?? "?"}{" "}
                  <span className="text-[var(--muted)]">
                    {pred.pred_home_score}–{pred.pred_away_score}
                  </span>{" "}
                  {match.away_team?.code ?? "?"} {match.away_team?.flag_emoji}
                </div>
                <div className="text-xs text-[var(--muted)]">{formatKickoff(match.kickoff_at)}</div>
              </div>
              <div className="text-right shrink-0">
                {match.status === "final" ? (
                  <div className="text-sm">
                    {match.home_score}–{match.away_score}{" "}
                    <span style={{ color: correct ? "var(--primary)" : "var(--danger)" }}>
                      {correct ? "✓" : "✗"}
                    </span>
                  </div>
                ) : (
                  <div className="chip">×{tier.multiplier}</div>
                )}
                {pred.scored && (
                  <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    {pred.points_awarded} pts
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
