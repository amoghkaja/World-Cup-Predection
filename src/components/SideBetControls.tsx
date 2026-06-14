"use client";

import { useState, useTransition } from "react";
import { saveSideBet, saveJoker, clearJoker } from "@/app/actions";
import { BTTS_REWARD, BTTS_PENALTY, JOKER_WRONG_PENALTY } from "@/lib/scoring";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export type SideState = { btts?: "yes" | "no" | null };

/**
 * Opt-in gambles for a single match: Both-teams-to-score, and the once-per-day
 * joker. Shown only for eligible, still-open matches. Writes go through server
 * actions (RPC-backed).
 */
export function SideBetControls({
  matchId,
  side,
  joker,
  jokerUsedElsewhere,
  live,
  unlockLabel,
  jokerUpside,
}: {
  matchId: number;
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
}) {
  const [btts, setBtts] = useState<"yes" | "no" | null>(side.btts ?? null);
  const [jok, setJok] = useState(joker);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const frozen = !live || pending;

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

  function pickBtts(v: "yes" | "no") {
    if (!live) return;
    const prev = btts;
    setBtts(v);
    run(() => saveSideBet({ matchId, pick: v }), () => setBtts(prev));
  }
  function toggleJoker() {
    if (!live || (jokerUsedElsewhere && !jok)) return;
    const prev = jok;
    setJok(!jok);
    run(
      () => (prev ? clearJoker({ matchId }) : saveJoker({ matchId })),
      () => setJok(prev)
    );
  }

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

  return (
    <div className="flex flex-col" style={{ gap: 12, paddingTop: 4 }}>
      <div className="flex items-center justify-between">
        <span className="t-label inline-flex items-center" style={{ color: "var(--text-3)", gap: 6 }}>
          Side bet &amp; joker
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
            width: 34,
            height: 34,
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

      {/* BTTS */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="t-sm" style={{ flex: 1, fontWeight: 600 }}>
          Both teams score?
          <span className="t-xs tnum" style={{ display: "block", color: "var(--text-3)" }}>
            win +{BTTS_REWARD} · miss {BTTS_PENALTY}
          </span>
        </span>
        <div style={segWrap}>
          <button type="button" disabled={frozen} style={seg(btts === "yes")} onClick={() => pickBtts("yes")}>
            Yes
          </button>
          <button type="button" disabled={frozen} style={seg(btts === "no")} onClick={() => pickBtts("no")}>
            No
          </button>
        </div>
      </div>

      {/* Joker */}
      <button
        type="button"
        disabled={frozen || (jokerUsedElsewhere && !jok)}
        onClick={toggleJoker}
        className="press flex items-center"
        style={{
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${jok ? "var(--gold)" : "var(--line)"}`,
          background: jok ? "var(--gold-soft)" : "var(--surface)",
          cursor: !live || (jokerUsedElsewhere && !jok) ? "not-allowed" : "pointer",
          opacity: !live || (jokerUsedElsewhere && !jok) ? 0.6 : 1,
        }}
      >
        <Icon name="star" size={18} sw={2} style={{ color: jok ? "var(--gold-strong)" : "var(--text-3)" }} />
        <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13.5, color: jok ? "var(--on-gold)" : "var(--text)" }}>
          {jok ? "Joker on this match — doubles your pick" : "Play your joker (doubles or penalises)"}
        </span>
        {jokerUsedElsewhere && !jok && (
          <span className="t-xs" style={{ color: "var(--text-3)" }}>used today</span>
        )}
      </button>

      {/* joker stakes — make the downside explicit before they commit */}
      <div
        className="flex items-center justify-center tnum"
        style={{ gap: 8, marginTop: -4, fontSize: 11.5, fontWeight: 700 }}
      >
        <span style={{ color: "var(--good)" }}>
          ✓ doubles{jokerUpside ? ` (up to +${jokerUpside})` : ""}
        </span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ color: "var(--bad)" }}>✗ {JOKER_WRONG_PENALTY} pts if wrong</span>
      </div>

      {err && (
        <p role="alert" className="t-xs" style={{ color: "var(--bad)", fontWeight: 650 }}>
          {err}
        </p>
      )}

      {help && (
        <Modal onClose={() => setHelp(false)} label="How the side bet & joker work" maxWidth={400}>
          <div className="trirule" style={{ flex: "none" }} />
          <div style={{ padding: "20px 20px 22px" }} className="flex flex-col gap-3">
            <h2 className="t-h2">Gambles &amp; the joker</h2>
            <p className="t-sm" style={{ color: "var(--text-2)" }}>
              Optional bets on top of your normal match pick. Win and you gain points; get them
              wrong and you lose points — so only bet when you&rsquo;re confident.
            </p>
            <div className="flex flex-col gap-2">
              {[
                ["Both teams to score", `A coin-flip yes/no call — win +${BTTS_REWARD}, miss ${BTTS_PENALTY}.`],
                ["Joker", `One per day. If your main pick is right it pays double${jokerUpside ? ` (up to +${jokerUpside} extra here)` : ""}; if it's wrong you lose ${Math.abs(JOKER_WRONG_PENALTY)} points.`],
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
              Side bets don&rsquo;t affect your streak or accuracy — only your main picks do.
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
