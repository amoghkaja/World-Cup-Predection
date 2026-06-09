"use client";

import { useState, useTransition } from "react";
import type { MatchWithTeams, Team } from "@/lib/types";
import { saveMatchResult, setMatchTeams } from "@/app/actions";
import { LocalTime } from "./LocalTime";
import { TeamBadge } from "./TeamBadge";
import { ScoreStepper } from "./ScoreStepper";
import { StatusPill } from "./StatusPill";

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
    <div className="card p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between t-xs" style={{ color: "var(--text-3)" }}>
        <span style={{ fontWeight: 700 }}>
          #{match.id} · {match.label}
        </span>
        <span>
          <LocalTime iso={match.kickoff_at} />
        </span>
      </div>

      {isKnockout && !teamsKnown ? (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input"
            style={{ width: "auto" }}
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Home…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} {t.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto" }}
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Away…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} {t.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            style={{ padding: "9px 16px", fontSize: 14 }}
            onClick={saveTeams}
            disabled={pending}
          >
            Set teams
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0" style={{ flex: "1 1 110px" }}>
              <TeamBadge team={match.home_team} placeholder={match.home_placeholder} />
            </div>
            <div className="flex items-center" style={{ gap: 10 }}>
              <ScoreStepper value={home} onChange={setHome} disabled={!teamsKnown} />
              <span className="t-h2" style={{ color: "var(--text-3)" }}>
                :
              </span>
              <ScoreStepper value={away} onChange={setAway} disabled={!teamsKnown} />
            </div>
            <div className="min-w-0 flex justify-end" style={{ flex: "1 1 110px" }}>
              <TeamBadge team={match.away_team} placeholder={match.away_placeholder} align="right" />
            </div>
          </div>

          {isKnockout && home === away && teamsKnown && (
            <div className="flex items-center gap-2">
              <span className="t-sm" style={{ color: "var(--text-2)" }}>
                Advancer:
              </span>
              <select
                className="input"
                style={{ width: "auto" }}
                value={winner}
                onChange={(e) => setWinner(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">—</option>
                <option value={match.home_team_id ?? ""}>{match.home_team?.code}</option>
                <option value={match.away_team_id ?? ""}>{match.away_team?.code}</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary"
              style={{ padding: "10px 18px", fontSize: 14 }}
              onClick={saveResult}
              disabled={pending || !teamsKnown}
            >
              {match.status === "final" ? "Update result" : "Save result"}
            </button>
            {match.status === "final" && <StatusPill status="done" />}
          </div>
        </>
      )}

      {msg && (
        <p className="t-xs" style={{ color: "var(--brand-strong)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
