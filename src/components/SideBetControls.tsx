"use client";

import { useState, useTransition } from "react";
import { saveSideBet, saveJoker, clearJoker } from "@/app/actions";
import { ouPayout, OU_MIN_LINE, OU_MAX_LINE } from "@/lib/scoring";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export type SideState = { btts?: "yes" | "no" | null; ouPick?: "over" | "under" | null; ouLine?: number | null };

/**
 * Opt-in gambles for a single match: Both-teams-to-score, a player-chosen
 * Over/Under line, and the once-per-day joker. Shown only for eligible,
 * still-open matches. Writes go through server actions (RPC-backed).
 */
export function SideBetControls({
  matchId,
  side,
  joker,
  jokerUsedElsewhere,
}: {
  matchId: number;
  side: SideState;
  joker: boolean;
  /** the day's joker is already on a different match */
  jokerUsedElsewhere: boolean;
}) {
  const [btts, setBtts] = useState<"yes" | "no" | null>(side.btts ?? null);
  const [ouPick, setOuPick] = useState<"over" | "under" | null>(side.ouPick ?? null);
  const [line, setLine] = useState<number>(side.ouLine ?? 2.5);
  const [jok, setJok] = useState(joker);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

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
    const prev = btts;
    setBtts(v);
    run(() => saveSideBet({ matchId, market: "btts", pick: v }), () => setBtts(prev));
  }
  function pickOu(v: "over" | "under", l = line) {
    const prevP = ouPick;
    const prevL = line;
    setOuPick(v);
    setLine(l);
    run(() => saveSideBet({ matchId, market: "ou", pick: v, line: l }), () => {
      setOuPick(prevP);
      setLine(prevL);
    });
  }
  function nudgeLine(delta: number) {
    const l = Math.min(OU_MAX_LINE, Math.max(OU_MIN_LINE, line + delta));
    setLine(l);
    if (ouPick) pickOu(ouPick, l); // re-save at the new line if a side is chosen
  }
  function toggleJoker() {
    if (jokerUsedElsewhere && !jok) return;
    const prev = jok;
    setJok(!jok);
    run(
      () => (prev ? clearJoker({ matchId }) : saveJoker({ matchId })),
      () => setJok(prev)
    );
  }

  const ouOdds = ouPick ? ouPayout(ouPick, line) : null;

  const seg = (active: boolean, accent = "var(--brand)"): React.CSSProperties => ({
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    border: "none",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: pending ? "wait" : "pointer",
    background: active ? accent : "transparent",
    color: active ? "var(--on-brand)" : "var(--text-2)",
  });
  const segWrap: React.CSSProperties = {
    display: "flex",
    gap: 4,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 4,
  };

  return (
    <div className="flex flex-col" style={{ gap: 12, paddingTop: 4 }}>
      <div className="flex items-center justify-between">
        <span className="t-label" style={{ color: "var(--text-3)" }}>
          Side bets · a gamble
        </span>
        <button
          type="button"
          aria-label="How side bets work"
          onClick={() => setHelp(true)}
          className="grid place-items-center press"
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--text-3)",
            fontWeight: 800,
            fontSize: 13,
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
        </span>
        <div style={{ ...segWrap, width: 132 }}>
          <button type="button" disabled={pending} style={seg(btts === "yes")} onClick={() => pickBtts("yes")}>
            Yes
          </button>
          <button type="button" disabled={pending} style={seg(btts === "no")} onClick={() => pickBtts("no")}>
            No
          </button>
        </div>
      </div>

      {/* Over / Under with a player-chosen line */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="t-sm" style={{ flex: 1, fontWeight: 600 }}>
          Total goals
          {ouOdds && (
            <span className="t-xs tnum" style={{ display: "block", color: "var(--text-3)" }}>
              win +{ouOdds.win} · miss {ouOdds.loss}
            </span>
          )}
        </span>
        {/* line stepper */}
        <div className="flex items-center" style={{ gap: 6 }}>
          <button
            type="button"
            aria-label="lower line"
            disabled={pending}
            onClick={() => nudgeLine(-1)}
            className="grid place-items-center press"
            style={{ width: 32, height: 40, borderRadius: 9, border: "1px solid var(--line-strong)", background: "var(--surface)" }}
          >
            <Icon name="minus" size={15} sw={2.4} />
          </button>
          <span className="tnum" style={{ width: 30, textAlign: "center", fontWeight: 800, fontSize: 16 }}>
            {line}
          </span>
          <button
            type="button"
            aria-label="raise line"
            disabled={pending}
            onClick={() => nudgeLine(1)}
            className="grid place-items-center press"
            style={{ width: 32, height: 40, borderRadius: 9, border: "1px solid var(--line-strong)", background: "var(--surface)" }}
          >
            <Icon name="plus" size={15} sw={2.4} />
          </button>
        </div>
        <div style={{ ...segWrap, width: 132 }}>
          <button type="button" disabled={pending} style={seg(ouPick === "under")} onClick={() => pickOu("under")}>
            Under
          </button>
          <button type="button" disabled={pending} style={seg(ouPick === "over")} onClick={() => pickOu("over")}>
            Over
          </button>
        </div>
      </div>

      {/* Joker */}
      <button
        type="button"
        disabled={pending || (jokerUsedElsewhere && !jok)}
        onClick={toggleJoker}
        className="press flex items-center"
        style={{
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${jok ? "var(--gold)" : "var(--line)"}`,
          background: jok ? "var(--gold-soft)" : "var(--surface)",
          cursor: jokerUsedElsewhere && !jok ? "not-allowed" : "pointer",
          opacity: jokerUsedElsewhere && !jok ? 0.6 : 1,
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

      {err && (
        <p role="alert" className="t-xs" style={{ color: "var(--bad)", fontWeight: 650 }}>
          {err}
        </p>
      )}

      {help && (
        <Modal onClose={() => setHelp(false)} label="How side bets & the joker work" maxWidth={400}>
          <div className="trirule" style={{ flex: "none" }} />
          <div style={{ padding: "20px 20px 22px" }} className="flex flex-col gap-3">
            <h2 className="t-h2">Gambles & the joker</h2>
            <p className="t-sm" style={{ color: "var(--text-2)" }}>
              These are optional bets on top of your normal match pick. Win and you gain points;
              get them wrong and you lose points — so only bet when you&rsquo;re confident.
            </p>
            <div className="flex flex-col gap-2">
              {[
                ["Both teams to score", "A coin-flip call — win +3, miss −2."],
                ["Over / Under", "Pick the goals line and a side. Safe lines pay a little, bold lines pay more — and cost more if they miss."],
                ["Joker", "One per day. Stake it on a match: if your main pick is right it pays double, if it's wrong you lose points."],
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
