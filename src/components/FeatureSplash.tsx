"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  FEATURE_CUTOFF_ISO,
  featuresLive,
  OUTCOME_POINTS,
  EXACT_BONUS,
  BTTS_REWARD,
  BTTS_PENALTY,
  JOKER_WRONG_PENALTY,
  STREAK_TARGET,
  STREAK_REWARD,
} from "@/lib/scoring";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

// Bumped so EVERY player sees this again — the points system changed (the
// perfect-day bonus became a "5 in a row" streak) and the splash is a mandatory
// read (can't be dismissed without stepping through). "What's new" replays it.
const KEY = "wc_points_change_v3";

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
    title: "Important change to points system — please read",
    body: "Every match is now scored on TWO things: getting the winner right, and getting the exact score right. The exact score is a bonus on top — and it also counts toward your accuracy, so nailing only the winner is a half-right pick.",
    content: <PointsTable />,
  },
  {
    icon: "dice",
    title: "New: side bets",
    body: `On any match you can add one optional gamble — Both Teams To Score, Yes or No. Call it right: +${BTTS_REWARD}. Get it wrong: ${BTTS_PENALTY}. It's separate from your match pick, so only bet when you're sure.`,
  },
  {
    icon: "star",
    title: "Play your joker",
    body: `Once a day, stake your joker on one match. If your main pick is right it pays double — if it's wrong, it costs you ${JOKER_WRONG_PENALTY}. Choose your spot wisely.`,
  },
  {
    icon: "flame",
    title: `Build a streak: ${STREAK_TARGET} in a row`,
    body: `Get the result right on ${STREAK_TARGET} matches in a row — in kickoff order — for a +${STREAK_REWARD} bonus, and again at every ${STREAK_TARGET} after that. One wrong result, or skipping an eligible match, resets your run to zero. (This replaces the old "perfect day" bonus, so it no longer matters what timezone you're in.)`,
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
    <Modal onClose={() => {}} dismissible={false} label="Important change to points system" maxWidth={420}>
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
