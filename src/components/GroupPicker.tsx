"use client";

import { useState, useTransition } from "react";
import type { GroupPrediction, Team } from "@/lib/types";
import { saveGroupPrediction } from "@/app/actions";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";

export function GroupPicker({
  group,
  teams,
  existing,
  locked,
}: {
  group: string;
  teams: Team[];
  existing: GroupPrediction | null;
  locked: boolean;
}) {
  const [winner, setWinner] = useState<number | null>(existing?.pred_winner_team_id ?? null);
  const [runnerup, setRunnerup] = useState<number | null>(
    existing?.pred_runnerup_team_id ?? null,
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const complete = winner != null && runnerup != null;

  function persist(nextWinner: number | null, nextRunnerup: number | null) {
    setErr(null);
    start(async () => {
      const res = await saveGroupPrediction({
        groupLabel: group,
        winnerId: nextWinner,
        runnerupId: nextRunnerup,
      });
      if (!res.ok) setErr(res.error);
    });
  }

  // Swap/clear pair: toggling a slot that already holds this team clears it;
  // selecting a team already in the other slot swaps it out of there first.
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
      style={{
        padding: 0,
        borderColor: complete ? "var(--brand-ring)" : "var(--line)",
      }}
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
        {existing?.scored ? (
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
          <span className="pill pill-open">Pick 2</span>
        )}
      </div>

      <div style={{ padding: "6px 10px 10px" }}>
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "1fr 56px 56px", padding: "6px 6px 4px" }}
        >
          <span />
          <span
            className="t-xs text-center"
            style={{ color: "var(--gold-strong)", fontWeight: 800 }}
          >
            1st
          </span>
          <span className="t-xs text-center" style={{ color: "var(--text-3)", fontWeight: 800 }}>
            2nd
          </span>
        </div>

        {teams.map((t) => {
          const isFirst = winner === t.id;
          const isSecond = runnerup === t.id;
          return (
            <div
              key={t.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: "1fr 56px 56px",
                padding: "5px 6px",
                borderRadius: 10,
                background: isFirst || isSecond ? "var(--brand-soft)" : "transparent",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Flag flag={t.flag_emoji} name={t.name} size="sm" />
                <span
                  className="truncate"
                  style={{ fontWeight: 700, fontSize: 14 }}
                >
                  {t.name}
                </span>
              </div>
              <PosToggle
                on={isFirst}
                kind="first"
                disabled={locked || pending}
                onClick={() => toggle("first", t.id)}
              />
              <PosToggle
                on={isSecond}
                kind="second"
                disabled={locked || pending}
                onClick={() => toggle("second", t.id)}
              />
            </div>
          );
        })}
      </div>

      {locked && (
        <p
          className="t-xs text-center"
          style={{ color: "var(--text-3)", padding: "0 12px 12px" }}
        >
          <Icon name="lock" size={12} sw={2.4} style={{ verticalAlign: "-2px" }} /> Locked
        </p>
      )}
      {err && (
        <p
          className="t-xs text-center"
          style={{ color: "var(--bad)", padding: "0 12px 12px" }}
        >
          {err}
        </p>
      )}
    </div>
  );
}

function PosToggle({
  on,
  kind,
  disabled,
  onClick,
}: {
  on: boolean;
  kind: "first" | "second";
  disabled?: boolean;
  onClick: () => void;
}) {
  const gold = kind === "first";
  return (
    <div className="grid place-items-center">
      <button
        type="button"
        aria-label={kind === "first" ? "Pick as winner" : "Pick as runner-up"}
        aria-pressed={on}
        disabled={disabled}
        onClick={onClick}
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          border: on ? "none" : "1.5px solid var(--line-strong)",
          background: on ? (gold ? "var(--gold)" : "var(--brand)") : "transparent",
          color: on ? (gold ? "var(--on-gold)" : "var(--on-brand)") : "var(--text-3)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all .15s",
        }}
      >
        {on ? (
          <Icon name="check" size={17} sw={3} />
        ) : (
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              background: "var(--line-strong)",
            }}
          />
        )}
      </button>
    </div>
  );
}
