import type { MatchWithTeams, Prediction } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { formatKickoff, isLocked } from "@/lib/format";
import { Countdown } from "./Countdown";
import { PredictionForm } from "./PredictionForm";

export function MatchCard({
  match,
  prediction,
}: {
  match: MatchWithTeams;
  prediction: Prediction | null;
}) {
  const locked = isLocked(match.kickoff_at);
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--accent)]">
            {STAGE_LABELS[match.stage]}
            {match.group_label ? ` · Group ${match.group_label}` : ""}
          </span>
          <span className="text-xs text-[var(--muted)]">{formatKickoff(match.kickoff_at)}</span>
        </div>
        <Countdown kickoff={match.kickoff_at} />
      </div>

      {match.status === "final" && match.home_score != null && (
        <div className="text-center text-sm font-bold text-[var(--foreground)]">
          Result: {match.home_team?.code ?? "?"} {match.home_score}–{match.away_score}{" "}
          {match.away_team?.code ?? "?"}
        </div>
      )}

      <PredictionForm match={match} existing={prediction} locked={locked} />
    </div>
  );
}
