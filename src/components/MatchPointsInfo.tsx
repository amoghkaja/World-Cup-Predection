"use client";

import { useState } from "react";
import Link from "next/link";
import { OUTCOME_POINTS, EXACT_BONUS, maxPointsForStage } from "@/lib/scoring";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

/**
 * A small "ⓘ" button on a match that opens a stage-aware explainer of exactly
 * how THIS match scores — the result/advancer points, the exact-score bonus and
 * the max on offer — with a link to the full scoring guide. Sits alongside the
 * side-bet/joker help so every match has a clear "how do points work?" affordance.
 */
export function MatchPointsInfo({ stage }: { stage: MatchStage }) {
  const [open, setOpen] = useState(false);
  const isKnockout = stage !== "group";
  const base = OUTCOME_POINTS[stage];
  const exact = EXACT_BONUS[stage];
  const max = maxPointsForStage(stage);

  return (
    <>
      <button
        type="button"
        aria-label="How this match scores"
        onClick={() => setOpen(true)}
        className="inline-flex items-center press"
        style={{
          gap: 4,
          height: 24,
          padding: "0 8px",
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--text-2)",
          fontWeight: 700,
          fontSize: 11.5,
        }}
      >
        <span
          aria-hidden
          className="grid place-items-center"
          style={{ width: 14, height: 14, borderRadius: 999, background: "var(--text-3)", color: "var(--surface)", fontSize: 9.5, fontWeight: 900 }}
        >
          i
        </span>
        Points
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} label="How this match scores" maxWidth={400}>
          <div className="trirule" style={{ flex: "none" }} />
          <div style={{ padding: "20px 20px 22px" }} className="flex flex-col gap-3">
            <div className="t-label" style={{ color: "var(--text-3)" }}>
              {STAGE_LABELS[stage]} · how points work
            </div>
            <h2 className="t-h2">Up to {max} pts on this match</h2>

            <div className="flex flex-col gap-2">
              <Line
                label={isKnockout ? "Correct team to advance" : "Correct result (Home / Draw / Away)"}
                value={`${base} pts`}
              />
              <Line
                label={isKnockout ? "Exact 90' score bonus" : "Exact score bonus"}
                value={`+${exact} pts`}
                gold
              />
            </div>

            {isKnockout && (
              <p className="t-xs" style={{ color: "var(--text-3)" }}>
                In a knockout the result points go to picking the team that{" "}
                <strong>advances</strong> — get the survivor wrong and the match scores 0, even if
                you nailed the score. The exact-score bonus is judged at <strong>90 minutes</strong>;
                extra time and penalties only decide who goes through.
              </p>
            )}

            <p className="t-xs" style={{ color: "var(--text-3)" }}>
              A wrong pick simply scores 0 — it never costs you points. Optional side bets and the
              joker (the “i” by <strong>Side bets &amp; joker</strong> explains those) can add more
              on top.
            </p>

            <Link
              href="/scoring"
              className="btn btn-ghost w-full"
              onClick={() => setOpen(false)}
            >
              Full scoring guide
              <Icon name="chevR" size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}

function Line({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
      <b className="tnum" style={{ fontSize: 14, color: gold ? "var(--gold-strong)" : "var(--text)" }}>
        {value}
      </b>
    </div>
  );
}
