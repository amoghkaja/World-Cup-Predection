"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { GroupPrediction, Team } from "@/lib/types";
import { saveGroupPrediction } from "@/app/actions";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";

export function GroupPicker({
  group,
  teams,
  existing,
  locked,
  onCompleteChange,
}: {
  group: string;
  teams: Team[];
  existing: GroupPrediction | null;
  locked: boolean;
  onCompleteChange?: (complete: boolean) => void;
}) {
  const [winner, setWinner] = useState<number | null>(existing?.pred_winner_team_id ?? null);
  const [runnerup, setRunnerup] = useState<number | null>(existing?.pred_runnerup_team_id ?? null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const complete = winner != null && runnerup != null;

  // Report completion to a parent (the setup wizard) without re-render loops.
  const cbRef = useRef(onCompleteChange);
  useEffect(() => {
    cbRef.current = onCompleteChange;
  }, [onCompleteChange]);
  useEffect(() => {
    cbRef.current?.(complete);
  }, [complete]);

  // Toast: brief bottom-of-screen confirmation so the save is visible no
  // matter where the user has scrolled. The header pill stays "Saved" after.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function persist(nextWinner: number | null, nextRunnerup: number | null) {
    setErr(null);
    start(async () => {
      const res = await saveGroupPrediction({
        groupLabel: group,
        winnerId: nextWinner,
        runnerupId: nextRunnerup,
      });
      if (!res.ok) {
        setErr(res.error);
        setSaved(false);
      } else {
        setSaved(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  // Tapping a slot that already holds the team clears it; picking a team that's
  // in the other slot moves it here.
  function toggle(slot: "first" | "second", teamId: number) {
    if (locked) return;
    let nextWinner = winner;
    let nextRunnerup = runnerup;
    if (slot === "first") {
      if (winner === teamId) nextWinner = null;
      else {
        if (runnerup === teamId) nextRunnerup = null;
        nextWinner = teamId;
      }
    } else {
      if (runnerup === teamId) nextRunnerup = null;
      else {
        if (winner === teamId) nextWinner = null;
        nextRunnerup = teamId;
      }
    }
    setWinner(nextWinner);
    setRunnerup(nextRunnerup);
    persist(nextWinner, nextRunnerup);
  }

  return (
    <div
      className="card overflow-hidden"
      style={{ padding: 0, borderColor: complete ? "var(--brand-ring)" : "var(--line)" }}
    >
      <div className="card-h">
        <span className="td" style={{ fontSize: 14 }}>
          Group {group}
        </span>
        {pending ? (
          <span className="pill pill-locked">Saving…</span>
        ) : existing?.scored ? (
          <span className="pill pill-done">
            <Icon name="check" size={12} sw={3} />
            {existing.points_awarded} pts
          </span>
        ) : complete ? (
          <span className="pill pill-done">
            <Icon name="check" size={12} sw={3} />
            Saved
          </span>
        ) : winner != null || runnerup != null ? (
          <span className="pill pill-open">1 of 2 picked</span>
        ) : (
          <span className="pill pill-open">Pick 1st &amp; 2nd</span>
        )}
      </div>

      <div>
        {teams.map((t, i) => {
          const isFirst = winner === t.id;
          const isSecond = runnerup === t.id;
          return (
            <div
              key={t.id}
              className="grid items-center rowh"
              style={{
                gridTemplateColumns: "27px 38px 1fr 50px 50px",
                gap: 10,
                padding: "8px 14px",
                borderTop: i ? "1px solid var(--line)" : "none",
                background: isFirst || isSecond ? "var(--brand-soft)" : "transparent",
                transition: "background .18s ease",
              }}
            >
              <Flag flag={t.flag_emoji} name={t.name} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 13.5,
                  letterSpacing: "0.02em",
                }}
              >
                {t.code}
              </span>
              <span className="truncate t-sm" style={{ color: "var(--text-2)" }}>
                {t.name}
              </span>
              <PosToggle label="1st" on={isFirst} gold disabled={locked || pending} onClick={() => toggle("first", t.id)} />
              <PosToggle label="2nd" on={isSecond} disabled={locked || pending} onClick={() => toggle("second", t.id)} />
            </div>
          );
        })}
      </div>

      {locked && (
        <p className="t-xs text-center" style={{ color: "var(--text-3)", padding: "0 12px 12px" }}>
          <Icon name="lock" size={12} sw={2.4} style={{ verticalAlign: "-2px" }} /> Locked
        </p>
      )}
      {err && (
        <p className="t-xs text-center" style={{ color: "var(--bad)", padding: "0 12px 12px" }}>
          {err}
        </p>
      )}

      {/* floating save confirmation — visible wherever the user is scrolled */}
      {saved && !pending && (
        <div
          role="status"
          className="anim-pop"
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(78px + env(safe-area-inset-bottom))",
            zIndex: 60,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "var(--text)",
            color: "var(--bg)",
            borderRadius: 999,
            padding: "9px 16px",
            fontWeight: 700,
            fontSize: 13.5,
            boxShadow: "var(--shadow-lg)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <Icon name="check" size={14} sw={3} style={{ color: "var(--good)" }} />
          Group {group} saved
        </div>
      )}
    </div>
  );
}

function PosToggle({
  label,
  on,
  gold,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  gold?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  // Broadcast group tags: 1st = solid green, 2nd = accent-soft w/ accent ring.
  return (
    <button
      type="button"
      aria-label={gold ? "Pick as group winner (1st)" : "Pick as runner-up (2nd)"}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center press"
      style={{
        gap: 3,
        height: 36,
        borderRadius: 8,
        border: "none",
        boxShadow: on
          ? gold
            ? "none"
            : "inset 0 0 0 1px var(--brand)"
          : "inset 0 0 0 1px var(--line-strong)",
        background: on ? (gold ? "var(--green)" : "var(--brand-soft)") : "transparent",
        color: on ? (gold ? "var(--on-good)" : "var(--brand-strong)") : "var(--text-3)",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .15s ease, color .15s ease, box-shadow .15s ease",
      }}
    >
      {on && <Icon name="check" size={12} sw={3} />}
      {label}
    </button>
  );
}
