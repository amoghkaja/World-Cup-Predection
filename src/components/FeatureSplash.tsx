"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  FEATURE_CUTOFF_ISO,
  featuresLive,
  OUTCOME_POINTS,
  EXACT_BONUS,
  BTTS_PENALTY,
  BTTS_PENALTY_GROUP,
  KO_SIDE_BET,
  JOKER_PENALTY_BY_STAGE,
  STREAK_TARGET,
  STREAK_REWARD,
} from "@/lib/scoring";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

// Bumped so EVERY player sees this again — the knockouts are live with new
// scoring (who-advances gates the points), new ET/pens side bets, and
// stage-scaled joker/streak. Mandatory read (can't be dismissed without
// stepping through). "What's new" replays it.
const KEY = "wc_points_change_v4";

const UNLOCK_LABEL = new Date(FEATURE_CUTOFF_ISO).toLocaleString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

// A few representative stages for the match-points table (pulled live from the
// scoring module so this can never drift from how points are actually awarded).
const TABLE_STAGES: MatchStage[] = ["group", "r16", "qf", "sf", "final"];


function PointsTable() {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        marginTop: 14,
        textAlign: "left",
      }}
    >
      <div
        className="t-label tnum"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 10,
          padding: "8px 12px",
          background: "var(--surface-2)",
          color: "var(--text-3)",
        }}
      >
        <span>Round</span>
        <span style={{ textAlign: "right" }}>Winner</span>
        <span style={{ textAlign: "right" }}>+ Score</span>
        <span style={{ textAlign: "right" }}>Max</span>
      </div>
      {TABLE_STAGES.map((s, i) => (
        <div
          key={s}
          className="tnum"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 10,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 650,
            borderTop: i === 0 ? "none" : "1px solid var(--line)",
          }}
        >
          <span style={{ fontWeight: 600 }}>{STAGE_LABELS[s]}</span>
          <span style={{ textAlign: "right" }}>{OUTCOME_POINTS[s]}</span>
          <span style={{ textAlign: "right", color: "var(--gold-strong)" }}>
            +{EXACT_BONUS[s]}
          </span>
          <span style={{ textAlign: "right", fontWeight: 800 }}>
            {OUTCOME_POINTS[s] + EXACT_BONUS[s]}
          </span>
        </div>
      ))}
    </div>
  );
}

type Step = { icon: string; title: string; body: string; content?: ReactNode };

const STEPS: Step[] = [
  {
    icon: "bolt",
    title: "Knockouts are here — picking who advances earns the points",
    body: "In a knockout the big points go to picking the team that ADVANCES — get the survivor wrong and the match scores 0, even if you nailed the score. The exact-score bonus is judged at 90 minutes; extra time and penalties only decide who goes through (you'll see “a.e.t.” or “won 4-2 on pens”).",
    content: <PointsTable />,
  },
  {
    icon: "dice",
    title: "New: knockout side bets",
    body: `Two opt-in long-shots on knockout ties, alongside Both Teams To Score: “Goes to extra time?” (right +${KO_SIDE_BET.et.win}, wrong ${KO_SIDE_BET.et.miss}) and “Decided on penalties?” (right +${KO_SIDE_BET.pens.win}, wrong ${KO_SIDE_BET.pens.miss}). You only back YES — skip it if you reckon it ends in 90. (Heads up: a missed BTTS costs ${Math.abs(BTTS_PENALTY_GROUP)} in the groups, ${Math.abs(BTTS_PENALTY)} from the Round of 32 on.)`,
  },
  {
    icon: "flame",
    title: "Joker & streak scale up",
    body: `The deeper the round, the bigger the stakes. A wrong joker now costs more in the later rounds (down to ${JOKER_PENALTY_BY_STAGE.final} in the final), and a ${STREAK_TARGET}-in-a-row streak pays more the further it runs — +${STREAK_REWARD} in the groups, up to +${STREAK_REWARD * 3} on the final.`,
  },
];

export function FeatureSplash() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only localStorage check
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // localStorage unavailable — just don't auto-show.
    }
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("wc:open-features", handler);
    return () => window.removeEventListener("wc:open-features", handler);
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    // Not dismissible: backdrop/Escape won't close it — the only way out is to
    // step through and acknowledge, so the points change can't be skipped.
    <Modal onClose={() => {}} dismissible={false} label="What's new for the knockouts" maxWidth={420}>
      <div className="trirule" style={{ flex: "none" }} />
      <div style={{ padding: "26px 22px 20px", textAlign: "center", overflowY: "auto" }}>
        <div
          className="grid place-items-center mx-auto"
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "var(--gold-soft)",
            color: "var(--gold-strong)",
            marginBottom: 14,
          }}
        >
          <Icon name={s.icon} size={30} />
        </div>
        <h2 className="t-h2" style={{ marginBottom: 8 }}>
          {s.title}
        </h2>
        <p className="t-body" style={{ color: "var(--text-2)" }}>
          {s.body}
        </p>
        {s.content}

        {!featuresLive() && (
          <div
            className="inline-flex items-center mx-auto"
            style={{
              gap: 6,
              marginTop: 14,
              padding: "7px 12px",
              borderRadius: 999,
              background: "var(--surface-2)",
              color: "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 650,
            }}
          >
            <Icon name="lock" size={13} />
            Bets unlock {UNLOCK_LABEL}
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5" style={{ margin: "18px 0" }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 18 : 7,
                height: 7,
                borderRadius: 99,
                background: i === step ? "var(--gold-strong)" : "var(--line-strong)",
                transition: "all .2s",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: "none" }}
              onClick={() => setStep((v) => v - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => (last ? close() : setStep((v) => v + 1))}
          >
            {last ? "I understand" : "Next"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
