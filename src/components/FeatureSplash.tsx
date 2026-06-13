"use client";

import { useEffect, useState } from "react";
import { FEATURE_CUTOFF_ISO, featuresLive } from "@/lib/scoring";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

// Shown once to announce the new features (before they unlock too, as a teaser).
// Replayable via the "What's new" event.
const KEY = "wc_features_v1";

const UNLOCK_LABEL = new Date(FEATURE_CUTOFF_ISO).toLocaleString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: "dice",
    title: "New: side bets",
    body: "On every match you can now add an optional gamble — Both Teams To Score. Call it right and you gain points; get it wrong and you lose them. Only bet when you're sure.",
  },
  {
    icon: "star",
    title: "Play your joker",
    body: "Once a day, stake your joker on one match. If your main pick is right it pays double — if it's wrong, it costs you. Choose your spot wisely.",
  },
  {
    icon: "flame",
    title: "Build a streak",
    body: "Pick correctly match after match to build a streak for bonus points. Miss one — or skip a game — and it resets. Nail a whole matchday for a Perfect Day bonus.",
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
    <Modal onClose={close} label="What's new">
      <div className="trirule" style={{ flex: "none" }} />
      <div style={{ padding: "26px 22px 20px", textAlign: "center" }}>
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
            Unlocks {UNLOCK_LABEL}
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
            {last ? "Let's play" : "Next"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
