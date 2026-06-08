"use client";

import { useState, useTransition } from "react";
import type { MatchWithTeams, Team } from "@/lib/types";
import { saveMatchResult, setMatchTeams } from "@/app/actions";
import { formatKickoff } from "@/lib/format";

export function AdminMatchRow({ match, teams }: { match: MatchWithTeams; teams: Team[] }) {
  const isKnockout = match.stage !== "group";
  const teamsKnown = !!match.home_team && !!match.away_team;

  const [homeTeam, setHomeTeam] = useState<number | "">(match.home_team_id ?? "");
  const [awayTeam, setAwayTeam] = useState<number | "">(match.away_team_id ?? "");
  const [home, setHome] = useState(match.home_score ?? 0);
  const [away, setAway] = useState(match.away_score ?? 0);
  const [winner, setWinner] = useState<number | "">(match.winner_team_id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function saveTeams() {
    setMsg(null);
    start(async () => {
      const res = await setMatchTeams({
        matchId: match.id,
        homeTeamId: homeTeam === "" ? null : Number(homeTeam),
        awayTeamId: awayTeam === "" ? null : Number(awayTeam),
      });
      setMsg(res.ok ? "Teams set" : res.error);
    });
  }

  function saveResult() {
    setMsg(null);
    let w: number | null = winner === "" ? null : Number(winner);
    if (home > away) w = match.home_team_id;
    else if (away > home) w = match.away_team_id;
    start(async () => {
      const res = await saveMatchResult({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
        winnerTeamId: w,
      });
      setMsg(res.ok ? "Result saved & scored ✓" : res.error);
    });
  }

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          #{match.id} · {match.label}
        </span>
        <span>{formatKickoff(match.kickoff_at)}</span>
      </div>

      {isKnockout && !teamsKnown ? (
        <div className="flex items-center gap-2 text-sm">
          <select className="input" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Home…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.code} {t.name}</option>
            ))}
          </select>
          <select className="input" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Away…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.code} {t.name}</option>
            ))}
          </select>
          <button className="btn btn-ghost text-sm" onClick={saveTeams} disabled={pending}>Set</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-semibold">{match.home_team?.flag_emoji} {match.home_team?.code}</span>
          <input type="number" min={0} className="input w-16 text-center" value={home} onChange={(e) => setHome(Number(e.target.value))} />
          <span>–</span>
          <input type="number" min={0} className="input w-16 text-center" value={away} onChange={(e) => setAway(Number(e.target.value))} />
          <span className="font-semibold">{match.away_team?.code} {match.away_team?.flag_emoji}</span>
          {isKnockout && home === away && teamsKnown && (
            <select className="input w-32" value={winner} onChange={(e) => setWinner(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Advancer…</option>
              <option value={match.home_team_id ?? ""}>{match.home_team?.code}</option>
              <option value={match.away_team_id ?? ""}>{match.away_team?.code}</option>
            </select>
          )}
          <button className="btn btn-primary text-sm" onClick={saveResult} disabled={pending || !teamsKnown}>
            {match.status === "final" ? "Update" : "Save result"}
          </button>
          {match.status === "final" && <span className="chip" style={{ color: "var(--primary)" }}>final</span>}
        </div>
      )}
      {msg && <p className="text-xs" style={{ color: "var(--primary)" }}>{msg}</p>}
    </div>
  );
}
