import type { MatchWithTeams, Prediction } from "@/lib/types";
import { actualOutcomeForMatch } from "@/lib/scoring";
import { isLocked } from "@/lib/format";
import { Flag } from "@/components/TeamBadge";
import { Icon } from "@/components/Icon";
import { PointsBadge } from "@/components/PointsBadge";

// One row of the My Predictions history list. Server-rendered: derives the
// result/correctness straight from the (already-scored) match + prediction.
export function CompactPredictionRow({
  match,
  pred,
  last,
}: {
  match: MatchWithTeams;
  pred: Prediction;
  last?: boolean;
}) {
  const settled = match.status === "final" && match.home_score != null && match.away_score != null;
  const actual = actualOutcomeForMatch(match);
  const correct = settled && actual != null && pred.pred_outcome === actual;
  const locked = isLocked(match.kickoff_at);

  const home = match.home_team;
  const away = match.away_team;

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "13px 16px",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Flag flag={home?.flag_emoji} name={home?.name} size="sm" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{home?.code ?? "?"}</span>
          <span
            className="tnum"
            style={{ color: "var(--text-3)", fontWeight: 700, fontSize: 13, margin: "0 2px" }}
          >
            {pred.pred_home_score}–{pred.pred_away_score}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{away?.code ?? "?"}</span>
          <Flag flag={away?.flag_emoji} name={away?.name} size="sm" />
        </div>
        <span className="t-xs" style={{ color: "var(--text-3)" }}>
          {match.group_label ? `Group ${match.group_label}` : "Knockout"}
          {settled
            ? ` · Final ${match.home_score}–${match.away_score}`
            : locked
              ? " · In progress"
              : " · Awaiting kickoff"}
        </span>
      </div>

      {settled ? (
        <div className="flex items-center gap-2">
          <span
            className="grid place-items-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: correct ? "var(--good-soft)" : "var(--bad-soft)",
              color: correct ? "var(--good)" : "var(--bad)",
            }}
          >
            <Icon name={correct ? "check" : "x"} size={13} sw={3} />
          </span>
          <PointsBadge pts={pred.points_awarded} state={pred.points_awarded > 0 ? undefined : "miss"} />
        </div>
      ) : (
        <span className="pill pill-locked">
          <Icon name="clock" size={12} />
          Pending
        </span>
      )}
    </div>
  );
}
