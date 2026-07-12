"use client";

import { useState, useTransition } from "react";
import type { MatchStage, PredOutcome } from "@/lib/types";
import { savePrediction } from "@/app/actions";
import { Icon } from "./Icon";
import { Flag } from "./TeamBadge";
import { ScorePicker } from "./ScorePicker";
import { OutcomeToggle, type Outcome } from "./OutcomeToggle";

/**
 * Narrow shapes so callers (dashboard rows) can pass a slim payload instead of
 * full DB rows. MatchWithTeams / Prediction satisfy these structurally.
 */
export type PredictableTeam = { name: string; code: string; flag_emoji: string | null };
export type PredictableMatch = {
  id: number;
  stage: MatchStage;
  home_team: PredictableTeam | null;
  away_team: PredictableTeam | null;
};
export type ExistingPick = {
  pred_home_score: number;
  pred_away_score: number;
  pred_outcome: PredOutcome;
  scored: boolean;
  points_awarded: number;
};

// outcome <-> toggle code mappings (db uses home/away/draw, toggle uses H/A/D)
const toToggle = (o: PredOutcome): Outcome => (o === "home" ? "H" : o === "away" ? "A" : "D");

export function PredictionForm({
  match,
  existing,
  locked,
  compact,
  onSaved,
}: {
  match: PredictableMatch;
  existing: ExistingPick | null;
  locked: boolean;
  /** drawer (true) vs full match-detail surface (false) */
  compact?: boolean;
  /** fired after a successful save (e.g. to collapse a drawer) */
  onSaved?: () => void;
}) {
  const teamsKnown = !!match.home_team && !!match.away_team;
  const isKnockout = match.stage !== "group";

  const [home, setHome] = useState(existing?.pred_home_score ?? 1);
  const [away, setAway] = useState(existing?.pred_away_score ?? 1);
  // advancer only matters when a knockout pick is level
  const [advancer, setAdvancer] = useState<PredOutcome>(
    existing?.pred_outcome === "away" ? "away" : "home"
  );
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // derive outcome from the scoreline; knockout draws keep an advancer choice
  const outcome: PredOutcome =
    home > away ? "home" : away > home ? "away" : isKnockout ? advancer : "draw";

  const disabled = locked || !teamsKnown;
  const toggleVal: Outcome = isKnockout && home === away ? toToggle(advancer) : toToggle(outcome);

  function setOutcomeFromToggle(v: Outcome) {
    // tapping the toggle nudges the scoreline to match the chosen outcome
    if (v === "H") {
      if (!(home > away)) {
        setHome(1);
        setAway(0);
      }
    } else if (v === "A") {
      if (!(away > home)) {
        setHome(0);
        setAway(1);
      }
    } else {
      // draw — level the score; for knockouts also record the advancer
      const lvl = Math.max(0, Math.min(home, away));
      setHome(lvl);
      setAway(lvl);
    }
  }

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await savePrediction({
        matchId: match.id,
        outcome,
        homeScore: home,
        awayScore: away,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Prediction saved" });
        onSaved?.();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  if (!teamsKnown) {
    return (
      <p className="t-sm" style={{ color: "var(--text-3)", fontStyle: "italic" }}>
        Teams not set yet — you can predict once the bracket fills in.
      </p>
    );
  }

  const homeCode = match.home_team?.code ?? "HOME";
  const awayCode = match.away_team?.code ?? "AWAY";

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <OutcomeToggle
        value={toggleVal}
        disabled={disabled}
        onChange={setOutcomeFromToggle}
        home={match.home_team?.name ?? homeCode}
        away={match.away_team?.name ?? awayCode}
      />

      {/* scoreboard-style score entry: one tap per team */}
      <div className="flex flex-col" style={{ gap: compact ? 10 : 14, marginTop: compact ? 2 : 6 }}>
        {(
          [
            { team: match.home_team, code: homeCode, value: home, set: setHome },
            { team: match.away_team, code: awayCode, value: away, set: setAway },
          ] as const
        ).map((s) => (
          <div key={s.code} className="flex flex-col" style={{ gap: 6 }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center" style={{ gap: 8 }}>
                <Flag flag={s.team?.flag_emoji} name={s.team?.name} size="sm" />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: "0.02em",
                  }}
                >
                  {s.code}
                </span>
                <span className="t-xs truncate" style={{ color: "var(--text-3)", maxWidth: 140 }}>
                  {s.team?.name}
                </span>
              </span>
              <span
                key={s.value}
                className="tnum anim-pop"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--brand-strong)",
                  minWidth: 16,
                  textAlign: "right",
                }}
              >
                {s.value}
              </span>
            </div>
            <ScorePicker value={s.value} onChange={s.set} disabled={disabled} label={s.code} />
          </div>
        ))}
      </div>

      {isKnockout && (
        <p className="t-xs text-center" style={{ color: "var(--text-3)", marginTop: -4 }}>
          Scored at 90 minutes — extra time &amp; pens only decide who goes through.
        </p>
      )}

      {isKnockout && home === away && !disabled && (
        <div className="flex flex-col items-center" style={{ gap: 6 }}>
          <span className="t-xs" style={{ color: "var(--text-3)" }}>
            Who goes through (after extra time / pens)?
          </span>
          <div className="flex" style={{ gap: 8 }}>
            {(["home", "away"] as const).map((side) => {
              const team = side === "home" ? match.home_team : match.away_team;
              const on = advancer === side;
              return (
                <button
                  key={side}
                  type="button"
                  aria-pressed={on}
                  className={`btn ${on ? "btn-primary" : "btn-ghost"}`}
                  style={{ padding: "0 14px", fontSize: 13.5 }}
                  onClick={() => setAdvancer(side)}
                >
                  {team?.flag_emoji} {team?.code}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!locked && (
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={submit}
          disabled={isPending || disabled}
        >
          <Icon name="check" size={17} sw={2.6} />
          {isPending ? "Saving…" : existing ? "Update prediction" : "Save prediction"}
        </button>
      )}

      {!locked && (
        <div
          className="t-xs flex items-center justify-center"
          style={{ color: "var(--text-3)", gap: 6 }}
        >
          <Icon name="lock" size={12} />
          Locks the moment the match kicks off
        </div>
      )}

      {locked && existing && (
        <p className="t-xs text-center flex items-center justify-center" style={{ color: "var(--text-3)", gap: 6 }}>
          <Icon name="lock" size={12} />
          Locked · you predicted{" "}
          <strong className="tnum" style={{ color: "var(--text-2)" }}>
            {existing.pred_home_score}–{existing.pred_away_score}
          </strong>
          {existing.scored ? ` · ${existing.points_awarded} pts` : ""}
        </p>
      )}
      {locked && !existing && (
        <p className="t-xs text-center flex items-center justify-center" style={{ color: "var(--bad)", gap: 6 }}>
          <Icon name="lock" size={12} />
          Locked — no prediction made.
        </p>
      )}

      {msg && (
        <p
          role="status"
          className="t-xs text-center"
          style={{ color: msg.ok ? "var(--brand-strong)" : "var(--bad)" }}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
