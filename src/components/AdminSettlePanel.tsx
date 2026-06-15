"use client";

import { useState, useTransition } from "react";
import type { Team } from "@/lib/types";
import {
  settleGroup,
  settleGoldenBoot,
  settlePodium,
  recomputeFeatureScoring,
} from "@/app/actions";
import { PlayerCombobox } from "./PlayerCombobox";

const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function AdminSettlePanel({
  teams,
  players,
}: {
  teams: Team[];
  players: { name: string; nationality: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [boot, setBoot] = useState("");

  const byGroup = (g: string) => teams.filter((t) => t.group_label === g);

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? `${label} ✓` : `${label}: ${res.error ?? "failed"}`);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold" style={{ color: "var(--accent)" }}>
        Settle bonuses
      </h2>

      {/* Group winners / runners-up */}
      <div className="card p-3.5 flex flex-col gap-3">
        <div className="t-sm" style={{ color: "var(--text-2)" }}>
          Group winner &amp; runner-up (+4 each)
        </div>
        {GROUP_LABELS.map((g) => (
          <GroupSettleRow
            key={g}
            group={g}
            teams={byGroup(g)}
            disabled={pending}
            onSettle={(winnerId, runnerupId) =>
              run(`Group ${g}`, () => settleGroup({ groupLabel: g, winnerId, runnerupId }))
            }
          />
        ))}
      </div>

      {/* Podium */}
      <div className="card p-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="t-sm" style={{ color: "var(--text-2)", maxWidth: 360 }}>
          Podium auto-settles when you enter the Final &amp; 3rd-place results. Use this only to
          re-run it manually.
        </div>
        <button
          className="btn btn-ghost"
          style={{ padding: "9px 14px", fontSize: 14 }}
          disabled={pending}
          onClick={() => run("Podium", () => settlePodium())}
        >
          Re-settle podium
        </button>
      </div>

      {/* Side bets / joker / streak backfill */}
      <div className="card p-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="t-sm" style={{ color: "var(--text-2)", maxWidth: 360 }}>
          Side bets, joker &amp; streaks settle automatically. Run this once after launch (or after
          changing the scoring constants) to (re)compute them across already-played matches.
        </div>
        <button
          className="btn btn-ghost"
          style={{ padding: "9px 14px", fontSize: 14 }}
          disabled={pending}
          onClick={() => run("Recompute features", () => recomputeFeatureScoring())}
        >
          Recompute new features
        </button>
      </div>

      {/* Golden Boot */}
      <div className="card p-3.5 flex flex-col gap-2">
        <div className="t-sm" style={{ color: "var(--text-2)" }}>
          Golden Boot — actual top scorer (+15)
        </div>
        <div className="flex flex-col gap-2">
          <PlayerCombobox players={players} value={boot} onSelect={(name) => setBoot(name)} />
          <button
            className="btn btn-primary self-start"
            style={{ padding: "10px 16px", fontSize: 14 }}
            disabled={pending || !boot.trim()}
            onClick={() => run("Golden Boot", () => settleGoldenBoot(boot))}
          >
            Settle Golden Boot
          </button>
        </div>
      </div>

      {msg && (
        <p className="t-sm" style={{ color: "var(--brand-strong)" }}>
          {msg}
        </p>
      )}
    </section>
  );
}

function GroupSettleRow({
  group,
  teams,
  disabled,
  onSettle,
}: {
  group: string;
  teams: Team[];
  disabled: boolean;
  onSettle: (winnerId: number, runnerupId: number) => void;
}) {
  const [winner, setWinner] = useState<number | "">("");
  const [runnerup, setRunnerup] = useState<number | "">("");
  const ready = winner !== "" && runnerup !== "" && winner !== runnerup;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="t-sm" style={{ fontWeight: 700, width: 56, flex: "none" }}>
        Group {group}
      </span>
      <select
        className="input"
        style={{ width: "auto" }}
        value={winner}
        onChange={(e) => setWinner(e.target.value === "" ? "" : Number(e.target.value))}
      >
        <option value="">1st…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code} {t.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        style={{ width: "auto" }}
        value={runnerup}
        onChange={(e) => setRunnerup(e.target.value === "" ? "" : Number(e.target.value))}
      >
        <option value="">2nd…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code} {t.name}
          </option>
        ))}
      </select>
      <button
        className="btn btn-ghost"
        style={{ padding: "8px 14px", fontSize: 13 }}
        disabled={disabled || !ready}
        onClick={() => ready && onSettle(Number(winner), Number(runnerup))}
      >
        Settle
      </button>
    </div>
  );
}
