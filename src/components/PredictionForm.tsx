"use client";

import { useState, useTransition } from "react";
import type { MatchWithTeams, PredOutcome, Prediction } from "@/lib/types";
import { savePrediction } from "@/app/actions";
import { timeTier, maxPointsForStage } from "@/lib/scoring";
import { TeamBadge } from "./TeamBadge";

function Stepper({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-[var(--muted)] sr-only">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`decrease ${label}`}
          className="btn btn-ghost w-8 h-8 !p-0 text-lg"
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <span className="w-8 text-center text-2xl font-bold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`increase ${label}`}
          className="btn btn-ghost w-8 h-8 !p-0 text-lg"
          disabled={disabled || value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PredictionForm({
  match,
  existing,
  locked,
}: {
  match: MatchWithTeams;
  existing: Prediction | null;
  locked: boolean;
}) {
  const teamsKnown = !!match.home_team && !!match.away_team;
  const isKnockout = match.stage !== "group";

  const [home, setHome] = useState(existing?.pred_home_score ?? 0);
  const [away, setAway] = useState(existing?.pred_away_score ?? 0);
  // advancer is only meaningful for knockout draws
  const [advancer, setAdvancer] = useState<PredOutcome>(
    existing?.pred_outcome === "away" ? "away" : "home"
  );
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const outcome: PredOutcome =
    home > away ? "home" : away > home ? "away" : isKnockout ? advancer : "draw";

  const disabled = locked || !teamsKnown;

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await savePrediction({
        matchId: match.id,
        outcome,
        homeScore: home,
        awayScore: away,
      });
      setMsg(
        res.ok
          ? { ok: true, text: "Prediction saved!" }
          : { ok: false, text: res.error }
      );
    });
  }

  const tier = existing ? timeTier(existing.submitted_at, match.kickoff_at) : null;

  if (!teamsKnown) {
    return (
      <p className="text-sm text-[var(--muted)] italic">
        Teams not set yet — you can predict once the bracket fills in.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <TeamBadge team={match.home_team} />
          <Stepper value={home} onChange={setHome} disabled={disabled} label="home score" />
        </div>
        <span className="text-[var(--muted)] font-bold">vs</span>
        <div className="flex flex-col items-center gap-2">
          <TeamBadge team={match.away_team} align="right" />
          <Stepper value={away} onChange={setAway} disabled={disabled} label="away score" />
        </div>
      </div>

      {isKnockout && home === away && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-[var(--muted)]">Who advances (after extra time / pens)?</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn ${advancer === "home" ? "btn-primary" : "btn-ghost"} text-sm`}
              disabled={disabled}
              onClick={() => setAdvancer("home")}
            >
              {match.home_team?.flag_emoji} {match.home_team?.code}
            </button>
            <button
              type="button"
              className={`btn ${advancer === "away" ? "btn-primary" : "btn-ghost"} text-sm`}
              disabled={disabled}
              onClick={() => setAdvancer("away")}
            >
              {match.away_team?.flag_emoji} {match.away_team?.code}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>
          Pick:{" "}
          <strong className="text-[var(--foreground)]">
            {outcome === "draw"
              ? "Draw"
              : outcome === "home"
              ? match.home_team?.code
              : match.away_team?.code}
          </strong>{" "}
          {home}–{away}
        </span>
        <span>up to {maxPointsForStage(match.stage)} pts</span>
      </div>

      {!locked && (
        <button className="btn btn-primary" onClick={submit} disabled={isPending || disabled}>
          {isPending ? "Saving…" : existing ? "Update prediction" : "Save prediction"}
        </button>
      )}

      {locked && existing && (
        <p className="text-xs text-center text-[var(--muted)]">
          🔒 Locked. You predicted <strong>{existing.pred_home_score}–{existing.pred_away_score}</strong>
          {tier ? ` · ${tier.label} (×${tier.multiplier})` : ""}
          {existing.scored ? ` · ${existing.points_awarded} pts` : ""}
        </p>
      )}
      {locked && !existing && (
        <p className="text-xs text-center text-[var(--danger)]">🔒 Locked — no prediction made.</p>
      )}

      {msg && (
        <p
          className="text-xs text-center"
          style={{ color: msg.ok ? "var(--primary)" : "var(--danger)" }}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
