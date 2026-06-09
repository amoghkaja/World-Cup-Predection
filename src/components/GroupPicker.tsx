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

  function persist(nextWinner: number | null, nextRunnerup: number | null) {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await saveGroupPrediction({
        groupLabel: group,
        winnerId: nextWinner,
        runnerupId: nextRunnerup,
      });
      if (!res.ok) setErr(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
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
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="grid place-items-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: "var(--brand)",
              color: "var(--on-brand)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {group}
          </span>
          <span className="t-h3">Group {group}</span>
        </div>
        {pending ? (
          <span className="pill pill-locked">Saving…</span>
        ) : saved ? (
          <span className="pill pill-done">
            <Icon name="check" size={12} sw={3} />
            Saved
          </span>
        ) : existing?.scored ? (
          <span className="pill pill-done">
            <Icon name="check" size={12} sw={3} />
            {existing.points_awarded} pts
          </span>
        ) : complete ? (
          <span className="pill pill-done">
            <Icon name="check" size={12} sw={3} />
            Set
          </span>
        ) : (
          <span className="pill pill-open">Pick 1st &amp; 2nd</span>
        )}
      </div>

      <div style={{ padding: "10px 10px 12px" }}>
        <p className="t-xs" style={{ color: "var(--text-3)", padding: "0 4px 8px" }}>
          Tap <b style={{ color: "var(--gold-strong)" }}>1st</b> for the group winner and{" "}
          <b style={{ color: "var(--brand-strong)" }}>2nd</b> for the runner-up. Saves automatically.
        </p>

        {teams.map((t) => {
          const isFirst = winner === t.id;
          const isSecond = runnerup === t.id;
          return (
            <div
              key={t.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: "1fr 54px 54px",
                gap: 6,
                padding: "5px 6px",
                borderRadius: 10,
                background: isFirst || isSecond ? "var(--brand-soft)" : "transparent",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Flag flag={t.flag_emoji} name={t.name} size="sm" />
                <span className="truncate" style={{ fontWeight: 700, fontSize: 14 }}>
                  {t.name}
                </span>
              </div>
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
  return (
    <button
      type="button"
      aria-label={gold ? "Pick as group winner (1st)" : "Pick as runner-up (2nd)"}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1"
      style={{
        height: 34,
        borderRadius: 10,
        border: on ? "none" : "1.5px solid var(--line-strong)",
        background: on ? (gold ? "var(--gold)" : "var(--brand)") : "transparent",
        color: on ? (gold ? "var(--on-gold)" : "var(--on-brand)") : "var(--text-3)",
        fontWeight: 800,
        fontSize: 12.5,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
      }}
    >
      {on && <Icon name="check" size={13} sw={3} />}
      {label}
    </button>
  );
}
