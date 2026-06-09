"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "wc_onboarded_v1";

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: "trophy",
    title: "Welcome to World Cup Pick'em",
    body: "Predict the 2026 World Cup, earn points, and climb the leaderboard against your friends.",
  },
  {
    icon: "target",
    title: "Predict every match",
    body: "Call the exact score of each game. The correct result earns points; nailing the exact scoreline adds a bonus. Every pick locks at kickoff — and you can edit it any time before then.",
  },
  {
    icon: "grid",
    title: "Groups & the bracket",
    body: "Call who finishes 1st and 2nd in each group, and build the knockout bracket round by round as the teams are confirmed.",
  },
  {
    icon: "medal",
    title: "Podium & Golden Boot",
    body: "Pick the top three — champion, runner-up and third place — plus the Golden Boot. Lock these in before the tournament starts to earn the most points.",
  },
  {
    icon: "bolt",
    title: "Climb the board",
    body: "Every correct call adds up. Tap “How points work” any time to see the full scoring. Ready? Let's play.",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      // Browser-only check on mount (avoids an SSR/hydration mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // localStorage unavailable — just don't auto-show.
    }
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("wc:open-onboarding", handler);
    return () => window.removeEventListener("wc:open-onboarding", handler);
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
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        WebkitBackdropFilter: "blur(2px)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card anim-pop"
        style={{ maxWidth: 380, width: "100%", overflow: "hidden" }}
      >
        <div className="trirule" />
        <div style={{ padding: "26px 22px 22px", textAlign: "center" }}>
          <div
            className="grid place-items-center mx-auto"
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "var(--brand-soft)",
              color: "var(--brand-strong)",
              marginBottom: 16,
            }}
          >
            <Icon name={s.icon} size={32} />
          </div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>
            {s.title}
          </h2>
          <p className="t-body" style={{ color: "var(--text-2)" }}>
            {s.body}
          </p>

          <div className="flex items-center justify-center gap-1.5" style={{ margin: "20px 0" }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 20 : 7,
                  height: 7,
                  borderRadius: 99,
                  background: i === step ? "var(--brand)" : "var(--line-strong)",
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
                style={{ flex: "none", padding: "11px 16px" }}
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
              {last ? "Start playing" : "Next"}
            </button>
          </div>
          {!last && (
            <button
              type="button"
              onClick={close}
              style={{
                marginTop: 12,
                color: "var(--text-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
