"use client";

import { useState, useTransition } from "react";
import type { Team, TournamentPrediction } from "@/lib/types";
import { saveTournamentPrediction } from "@/app/actions";

export function TournamentPicker({
  teams,
  existing,
  locked,
}: {
  teams: Team[];
  existing: TournamentPrediction[];
  locked: boolean;
}) {
  const champ = existing.find((e) => e.type === "champion");
  const boot = existing.find((e) => e.type === "golden_boot");

  const [championId, setChampionId] = useState<number | "">(champ?.team_id ?? "");
  const [scorer, setScorer] = useState(boot?.text_value ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function saveChampion() {
    setMsg(null);
    start(async () => {
      const res = await saveTournamentPrediction({
        type: "champion",
        teamId: championId === "" ? null : Number(championId),
      });
      setMsg(res.ok ? { ok: true, text: "Champion saved 👑" } : { ok: false, text: res.error });
    });
  }

  function saveScorer() {
    setMsg(null);
    start(async () => {
      const res = await saveTournamentPrediction({
        type: "golden_boot",
        teamId: null,
        textValue: scorer.trim() || null,
      });
      setMsg(res.ok ? { ok: true, text: "Top scorer saved ⚽" } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex flex-col gap-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          👑 Tournament champion <span className="chip" style={{ color: "var(--accent)" }}>+30 pts</span>
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Who lifts the trophy? Lock it in before the tournament starts.
        </p>
        <select
          className="input"
          value={championId}
          disabled={locked}
          onChange={(e) => setChampionId(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">— pick a team —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.flag_emoji} {t.name}
            </option>
          ))}
        </select>
        {!locked && (
          <button className="btn btn-primary" onClick={saveChampion} disabled={pending}>
            Save champion
          </button>
        )}
        {champ?.scored && (
          <p className="text-xs text-[var(--accent)]">Scored: {champ.points_awarded} pts</p>
        )}
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          ⚽ Golden Boot <span className="chip" style={{ color: "var(--accent)" }}>+15 pts</span>
        </h2>
        <p className="text-sm text-[var(--muted)]">Name the tournament&apos;s top scorer.</p>
        <input
          className="input"
          placeholder="e.g. Kylian Mbappé"
          value={scorer}
          disabled={locked}
          onChange={(e) => setScorer(e.target.value)}
        />
        {!locked && (
          <button className="btn btn-primary" onClick={saveScorer} disabled={pending}>
            Save top scorer
          </button>
        )}
      </div>

      {locked && <p className="text-sm text-center text-[var(--muted)]">🔒 Tournament picks are locked.</p>}
      {msg && (
        <p className="text-sm text-center" style={{ color: msg.ok ? "var(--primary)" : "var(--danger)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
