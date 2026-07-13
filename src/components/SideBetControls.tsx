"use client";

import { useState, useTransition } from "react";
import { saveSideBet, clearSideBet, saveJoker, clearJoker } from "@/app/actions";
import { BTTS_REWARD, KO_SIDE_BET, JOKER_PENALTY_BY_STAGE, bttsPenaltyFor } from "@/lib/scoring";
import type { MatchStage, SideBetMarket } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export type SideState = Partial<Record<SideBetMarket, "yes" | "no">>;

type Pick = "yes" | "no" | null;

const QUESTION: Record<SideBetMarket, string> = {
  btts: "Both teams to score?",
  et: "Decided in extra time?",
  pens: "Decided on penalties?",
};

/**
 * Opt-in gambles for a single match plus the once-per-day joker. "Both teams to
 * score?" is a two-sided Yes/No call on any match. Knockouts add the dramatic-
 * ending market — "decided in extra time?" and "decided on penalties?" — the two
 * MUTUALLY EXCLUSIVE ways a tie ends beyond 90 minutes (yes-only long-shots; you
 * back at most one). Extra time here does NOT include a shootout — that's the
 * pens bet. Shown only for eligible, still-open matches; writes go through
 * RPC-backed server actions.
 */
export function SideBetControls({
  matchId,
  stage,
  side,
  joker,
  jokerUsedElsewhere,
  live,
  unlockLabel,
  jokerUpside,
  hasPick = true,
  stagedJoker = false,
  onStageJoker,
}: {
  matchId: number;
  stage: MatchStage;
  side: SideState;
  joker: boolean;
  /** the day's joker is already on a different match */
  jokerUsedElsewhere: boolean;
  /** features have unlocked (now ≥ cutoff) — until then everything is read-only */
  live: boolean;
  /** human label for when it unlocks, e.g. "Mon 15 Jun" */
  unlockLabel?: string;
  /** max extra points the joker can add on this match (= its max main-pick haul) */
  jokerUpside?: number;
  /** a saved prediction exists — without one the joker can only be STAGED
      (it saves together with the pick; see PredictPanel) */
  hasPick?: boolean;
  stagedJoker?: boolean;
  onStageJoker?: (v: boolean) => void;
}) {
  const isKnockout = stage !== "group";
  const [picks, setPicks] = useState<Record<SideBetMarket, Pick>>({
    btts: side.btts ?? null,
    et: side.et ?? null,
    pens: side.pens ?? null,
  });
  const [jok, setJok] = useState(joker);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const frozen = !live || pending;
  const jokerPenalty = JOKER_PENALTY_BY_STAGE[stage];
  const bttsMiss = bttsPenaltyFor(stage);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, revert: () => void) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        revert();
        setErr(res.error ?? "Couldn't save");
      }
    });
  }

  function pick(market: SideBetMarket, v: "yes" | "no") {
    if (!live || picks[market] === v) return; // already on this pick — nothing to save
    const prev = picks[market];
    setPicks((p) => ({ ...p, [market]: v }));
    run(
      () => saveSideBet({ matchId, market, pick: v }),
      () => setPicks((p) => ({ ...p, [market]: prev }))
    );
  }
  function clear(market: SideBetMarket) {
    if (!live || picks[market] == null) return;
    const prev = picks[market];
    setPicks((p) => ({ ...p, [market]: null }));
    run(
      () => clearSideBet({ matchId, market }),
      () => setPicks((p) => ({ ...p, [market]: prev }))
    );
  }
  // ET / pens are mutually exclusive — backing one drops the other (a single
  // call on how the tie ends). Tap an active one to drop it. The server action
  // also clears the opposite market, so this stays consistent even on a refresh.
  function pickKo(market: "et" | "pens") {
    if (!live) return;
    if (picks[market] === "yes") {
      clear(market);
      return;
    }
    const other = market === "et" ? "pens" : "et";
    const prev = { ...picks };
    setPicks((p) => ({ ...p, [market]: "yes", [other]: null }));
    run(
      () => saveSideBet({ matchId, market, pick: "yes" }),
      () => setPicks(prev)
    );
  }
  function toggleJoker() {
    if (!live) return;
    // No pick yet → stage it locally; it saves together with the prediction.
    if (!hasPick && onStageJoker) {
      if (jokerUsedElsewhere && !stagedJoker) return;
      onStageJoker(!stagedJoker);
      return;
    }
    if (jokerUsedElsewhere && !jok) return;
    const prev = jok;
    setJok(!jok);
    run(
      () => (prev ? clearJoker({ matchId }) : saveJoker({ matchId })),
      () => setJok(prev)
    );
  }
  // what the joker button shows: a saved joker or a staged one
  const jokOn = jok || stagedJoker;

  // BTTS is a two-sided Yes/No segmented control.
  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    border: "none",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: !live ? "not-allowed" : pending ? "wait" : "pointer",
    opacity: !live ? 0.55 : 1,
    background: active ? "var(--brand)" : "transparent",
    color: active ? "var(--on-brand)" : "var(--text-2)",
  });
  const segWrap: React.CSSProperties = {
    display: "flex",
    gap: 4,
    width: 132,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 4,
  };

  // The knockout "how it ends" long-shots — mutually exclusive, yes-only.
  const koMarkets: { market: "et" | "pens"; win: number; miss: number }[] = isKnockout
    ? [
        { market: "et", win: KO_SIDE_BET.et.win, miss: KO_SIDE_BET.et.miss },
        { market: "pens", win: KO_SIDE_BET.pens.win, miss: KO_SIDE_BET.pens.miss },
      ]
    : [];

  return (
    <div className="flex flex-col" style={{ gap: 12, paddingTop: 4 }}>
      <div className="flex items-center justify-between">
        <span className="t-label inline-flex items-center" style={{ color: "var(--text-3)", gap: 6 }}>
          Side bets &amp; joker
          {!live && (
            <span
              className="pill"
              style={{ background: "var(--surface-2)", color: "var(--text-3)", fontSize: 10, padding: "2px 7px" }}
            >
              <Icon name="lock" size={10} sw={2.4} />
              Unlocks {unlockLabel ?? "soon"}
            </span>
          )}
        </span>
        <button
          type="button"
          aria-label="How side bets work"
          onClick={() => setHelp(true)}
          className="grid place-items-center press"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--text-3)",
            fontWeight: 800,
            fontSize: 14,
            flex: "none",
          }}
        >
          i
        </button>
      </div>

      {/* BTTS — a two-sided Yes/No call on every match */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="t-sm" style={{ flex: 1, fontWeight: 600 }}>
          {QUESTION.btts}
          <span className="t-xs tnum" style={{ display: "block", color: "var(--text-3)" }}>
            win +{BTTS_REWARD} · miss {bttsMiss}
          </span>
        </span>
        <div style={segWrap}>
          <button type="button" disabled={frozen} style={seg(picks.btts === "yes")} onClick={() => pick("btts", "yes")}>
            Yes
          </button>
          <button type="button" disabled={frozen} style={seg(picks.btts === "no")} onClick={() => pick("btts", "no")}>
            No
          </button>
        </div>
        <button
          type="button"
          aria-label="Remove both-teams-to-score bet"
          title="Remove bet"
          disabled={frozen}
          onClick={() => clear("btts")}
          className="grid place-items-center press"
          style={{
            width: 40,
            height: 40,
            flex: "none",
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--text-3)",
            visibility: picks.btts === null ? "hidden" : "visible",
            cursor: frozen ? "not-allowed" : "pointer",
          }}
        >
          <Icon name="x" size={14} sw={2.4} />
        </button>
      </div>

      {/* Knockout "how it ends" — mutually exclusive, back YES on at most one */}
      {koMarkets.length > 0 && (
        <div className="t-xs" style={{ color: "var(--text-3)", marginTop: -4 }}>
          How it ends · back one (a shootout counts as extra time too)
        </div>
      )}
      {koMarkets.map(({ market, win, miss }) => {
        const on = picks[market] === "yes";
        return (
          <div key={market} className="flex items-center" style={{ gap: 10 }}>
            <span className="t-sm" style={{ flex: 1, fontWeight: 600 }}>
              {QUESTION[market]}
              <span className="t-xs tnum" style={{ display: "block", color: "var(--text-3)" }}>
                right +{win} · wrong {miss}
              </span>
            </span>
            <button
              type="button"
              disabled={frozen}
              onClick={() => pickKo(market)}
              className="press inline-flex items-center justify-center"
              style={{
                minWidth: 96,
                minHeight: 40,
                padding: "0 14px",
                gap: 6,
                borderRadius: 12,
                border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`,
                background: on ? "var(--brand)" : "var(--surface)",
                color: on ? "var(--on-brand)" : "var(--text-2)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: !live ? "not-allowed" : pending ? "wait" : "pointer",
                opacity: !live ? 0.55 : 1,
              }}
            >
              {on ? (
                <>
                  <Icon name="check" size={14} sw={2.6} />
                  Betting yes
                </>
              ) : (
                "Bet yes"
              )}
            </button>
          </div>
        );
      })}

      {/* Joker */}
      <button
        type="button"
        disabled={frozen || (jokerUsedElsewhere && !jokOn)}
        onClick={toggleJoker}
        title={
          jokerUsedElsewhere && !jokOn
            ? "One joker per day. Remove it on the other match to move it here."
            : undefined
        }
        className="press flex items-center"
        style={{
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${jokOn ? "var(--gold)" : "var(--line)"}`,
          background: jokOn ? "var(--gold-soft)" : "var(--surface)",
          cursor: !live || (jokerUsedElsewhere && !jokOn) ? "not-allowed" : "pointer",
          opacity: !live || (jokerUsedElsewhere && !jokOn) ? 0.6 : 1,
        }}
      >
        <Icon name="star" size={18} sw={2} style={{ color: jokOn ? "var(--gold-strong)" : "var(--text-3)" }} />
        <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13.5, color: jokOn ? "var(--on-gold)" : "var(--text)" }}>
          {stagedJoker
            ? "Joker staged — plays when you save your pick"
            : jok
              ? "Joker on this match — doubles your pick"
              : jokerUsedElsewhere
                ? "Joker is on another match today"
                : "Play your joker (doubles or penalises)"}
        </span>
        {jokerUsedElsewhere && !jokOn && (
          <span className="t-xs" style={{ color: "var(--text-3)", textAlign: "right", maxWidth: 92 }}>
            remove it there to move
          </span>
        )}
      </button>

      {/* joker stakes — make the (stage-scaled) downside explicit before they commit */}
      <div
        className="flex items-center justify-center tnum"
        style={{ gap: 8, marginTop: -4, fontSize: 11.5, fontWeight: 700 }}
      >
        <span style={{ color: "var(--good)" }}>
          ✓ doubles{jokerUpside ? ` (up to +${jokerUpside})` : ""}
        </span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ color: "var(--bad)" }}>✗ {jokerPenalty} pts if wrong</span>
      </div>

      {err && (
        <p role="alert" className="t-xs" style={{ color: "var(--bad)", fontWeight: 650 }}>
          {err}
        </p>
      )}

      {help && (
        <Modal onClose={() => setHelp(false)} label="How the side bets & joker work" maxWidth={400}>
          <div className="trirule" style={{ flex: "none" }} />
          <div style={{ padding: "20px 20px 22px" }} className="flex flex-col gap-3">
            <h2 className="t-h2">Gambles &amp; the joker</h2>
            <p className="t-sm" style={{ color: "var(--text-2)" }}>
              Optional bets on top of your normal match pick. Win and you gain points; get them
              wrong and you lose points — so only bet when you&rsquo;re confident.
            </p>
            <div className="flex flex-col gap-2">
              {[
                ["Both teams to score", `A Yes/No call on any match — win +${BTTS_REWARD}, a miss costs ${Math.abs(bttsMiss)}.`],
                ...(isKnockout
                  ? ([
                      [
                        "How the tie ends (extra time or pens)",
                        `Two long-shots on how the tie ends beyond 90 — decided in extra time (right +${KO_SIDE_BET.et.win}, wrong ${KO_SIDE_BET.et.miss}) or on penalties (right +${KO_SIDE_BET.pens.win}, wrong ${KO_SIDE_BET.pens.miss}). Back at most ONE — a shootout counts as penalties, not extra time. Skip both if you think it ends in 90.`,
                      ],
                    ] as [string, string][])
                  : []),
                ["Joker", `One per day. If your main pick is right it pays double${jokerUpside ? ` (up to +${jokerUpside} extra here)` : ""}; if it's wrong you lose ${Math.abs(jokerPenalty)} points (more in the later rounds).`],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start gap-2.5" style={{ padding: "9px 11px", borderRadius: 10, background: "var(--surface-2)" }}>
                  <Icon name="dice" size={16} style={{ color: "var(--brand)", marginTop: 2, flex: "none" }} />
                  <span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{t}</span>
                    <span className="t-xs" style={{ display: "block", color: "var(--text-3)" }}>{d}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="t-xs" style={{ color: "var(--text-3)" }}>
              Side bets don&rsquo;t affect your streak or accuracy — only your main picks do. The
              knockout bets are judged on how the tie was settled (90 mins, extra time or pens).
            </p>
            <button type="button" className="btn btn-primary w-full" onClick={() => setHelp(false)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
