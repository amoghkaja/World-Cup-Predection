"use client";

import { useState } from "react";
import type { MatchWithTeams, Prediction } from "@/lib/types";
import { actualOutcomeForMatch } from "@/lib/scoring";
import { isLocked } from "@/lib/format";
import { Flag } from "@/components/TeamBadge";
import { Icon } from "@/components/Icon";
import { PointsBadge } from "@/components/PointsBadge";
import { PredictionForm } from "@/components/PredictionForm";
import { Countdown } from "@/components/Countdown";

// One row of the My Predictions list. Open matches can be edited inline; settled
// matches show the result + points; in-progress matches are read-only.
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
  const editable = !locked && !settled;

  const [editing, setEditing] = useState(false);

  const home = match.home_team;
  const away = match.away_team;

  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div className="flex items-center gap-3" style={{ padding: "13px 16px" }}>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Flag flag={home?.flag_emoji} name={home?.name} size="sm" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{home?.code ?? "?"}</span>
            <span
              className="tnum"
              style={{
                color: settled ? "var(--text)" : "var(--text-3)",
                fontWeight: settled ? 800 : 700,
                fontSize: 13,
                margin: "0 2px",
              }}
            >
              {settled ? `${match.home_score}–${match.away_score}` : "vs"}
            </span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{away?.code ?? "?"}</span>
            <Flag flag={away?.flag_emoji} name={away?.name} size="sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="pill tnum"
              style={{
                background: settled
                  ? correct
                    ? "var(--good-soft)"
                    : "var(--surface-2)"
                  : "var(--brand-soft)",
                color: settled
                  ? correct
                    ? "var(--good)"
                    : "var(--text-3)"
                  : "var(--brand-strong)",
                fontSize: 11,
                padding: "3px 9px",
              }}
            >
              Your pick {pred.pred_home_score}–{pred.pred_away_score}
            </span>
            <span className="t-xs" style={{ color: "var(--text-3)" }}>
              {match.group_label ? `Group ${match.group_label}` : "Knockout"}
              {!settled && locked ? " · In progress" : ""}
            </span>
            {!settled && !locked && (
              <Countdown kickoff={match.kickoff_at} variant="labeled" lockLabel="Locks in" />
            )}
          </div>
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
        ) : editable ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "7px 13px", fontSize: 13 }}
            onClick={() => setEditing((v) => !v)}
          >
            <Icon name="edit" size={14} sw={2.2} />
            {editing ? "Close" : "Edit"}
          </button>
        ) : (
          <span className="pill pill-locked">
            <Icon name="clock" size={12} />
            Pending
          </span>
        )}
      </div>

      {editing && editable && (
        <div style={{ padding: "14px 16px 18px", background: "var(--surface-2)" }}>
          <PredictionForm match={match} existing={pred} locked={false} />
        </div>
      )}
    </div>
  );
}
