"use client";

import { useState, useTransition } from "react";
import type { GroupPrediction, Team } from "@/lib/types";
import { saveGroupPrediction } from "@/app/actions";

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
  const [winner, setWinner] = useState<number | "">(existing?.pred_winner_team_id ?? "");
  const [runnerup, setRunnerup] = useState<number | "">(existing?.pred_runnerup_team_id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await saveGroupPrediction({
        groupLabel: group,
        winnerId: winner === "" ? null : Number(winner),
        runnerupId: runnerup === "" ? null : Number(runnerup),
      });
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Group {group}</h3>
        {existing?.scored && (
          <span className="chip" style={{ color: "var(--accent)" }}>
            {existing.points_awarded} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {teams.map((t) => (
          <span key={t.id} className="chip justify-start">
            {t.flag_emoji} {t.name}
          </span>
        ))}
      </div>

      <label className="text-xs text-[var(--muted)]">
        🥇 Winner
        <select
          className="input mt-1"
          value={winner}
          disabled={locked}
          onChange={(e) => setWinner(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">— pick —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-[var(--muted)]">
        🥈 Runner-up
        <select
          className="input mt-1"
          value={runnerup}
          disabled={locked}
          onChange={(e) => setRunnerup(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">— pick —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {locked ? (
        <p className="text-xs text-center text-[var(--muted)]">🔒 Locked</p>
      ) : (
        <button className="btn btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      )}
      {msg && (
        <p className="text-xs text-center" style={{ color: msg.ok ? "var(--primary)" : "var(--danger)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
