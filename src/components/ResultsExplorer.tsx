"use client";

import { useMemo, useState } from "react";
import type { GroupTable } from "@/lib/standings";
import type { MatchWithTeams } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { zonedDayKey, zonedDayLabel, decidedNoteNamed } from "@/lib/format";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";
import { LocalKickoff } from "./LocalTime";
import { Segmented } from "./Segmented";

type View = "tables" | "matches";

const isFinished = (m: MatchWithTeams) =>
  m.status === "final" && m.home_score != null && m.away_score != null;

// Live group tables + played-match results. Tapping a team drills into its matches.
export function ResultsExplorer({
  standings,
  matches,
  tz,
}: {
  standings: GroupTable[];
  matches: MatchWithTeams[];
  /** Viewer's IANA timezone — match days group on the viewer's calendar. */
  tz: string | null;
}) {
  const [view, setView] = useState<View>("tables");
  const [teamId, setTeamId] = useState<number | null>(null);

  const finishedCount = useMemo(() => matches.filter(isFinished).length, [matches]);

  const team = useMemo(() => {
    if (teamId == null) return null;
    for (const g of standings) {
      const hit = g.rows.find((r) => r.team.id === teamId);
      if (hit) return hit.team;
    }
    return null;
  }, [standings, teamId]);

  // Team selected: their full schedule (played + upcoming). Otherwise: results only.
  const list = useMemo(() => {
    if (teamId != null) {
      return matches
        .filter((m) => m.home_team_id === teamId || m.away_team_id === teamId)
        .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    }
    return matches.filter(isFinished).sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
  }, [matches, teamId]);

  const days = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of list) {
      const k = zonedDayKey(m.kickoff_at, tz);
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    return [...map.entries()];
  }, [list, tz]);

  function pickTeam(id: number) {
    setTeamId(id);
    setView("matches");
  }

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <Segmented
        options={[
          { key: "tables" as View, label: "Tables" },
          { key: "matches" as View, label: teamId != null ? "Matches" : "Results", count: teamId == null ? finishedCount : undefined },
        ]}
        value={view}
        onChange={setView}
      />

      {view === "tables" && (
        <>
          <p className="t-xs" style={{ color: "var(--text-3)", marginTop: -6 }}>
            Live standings from final scores · tap a team for its matches · top two advance
          </p>
          <div className="grid md:grid-cols-2" style={{ gap: 13 }}>
            {standings.map((g) => (
              <div
                key={g.group}
                className="card"
                style={{
                  overflow: "hidden",
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 240px",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface-2)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span className="t-h3">Group {g.group}</span>
                  <span
                    className="t-label grid"
                    style={{
                      color: "var(--text-3)",
                      gridTemplateColumns: "repeat(4, 30px)",
                      textAlign: "center",
                    }}
                  >
                    <span>P</span>
                    <span>W</span>
                    <span>GD</span>
                    <span>Pts</span>
                  </span>
                </div>
                {g.rows.map((r, i) => (
                  <button
                    key={r.team.id}
                    type="button"
                    onClick={() => pickTeam(r.team.id)}
                    className="press flex items-center w-full text-left"
                    style={{
                      gap: 8,
                      padding: "9px 14px",
                      border: "none",
                      cursor: "pointer",
                      borderTop: i ? "1px solid var(--line)" : "none",
                      background: i < 2 ? "var(--brand-soft)" : "transparent",
                    }}
                  >
                    <span
                      className="tnum t-xs"
                      style={{
                        width: 14,
                        color: i < 2 ? "var(--brand-strong)" : "var(--text-3)",
                        fontWeight: 800,
                      }}
                    >
                      {i + 1}
                    </span>
                    <Flag flag={r.team.flag_emoji} name={r.team.name} size="sm" />
                    <span
                      className="truncate"
                      style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5 }}
                    >
                      {r.team.name}
                    </span>
                    <span
                      className="tnum t-sm grid"
                      style={{
                        gridTemplateColumns: "repeat(4, 30px)",
                        textAlign: "center",
                        color: "var(--text-2)",
                      }}
                    >
                      <span>{r.p}</span>
                      <span>{r.w}</span>
                      <span>{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</span>
                      <span style={{ fontWeight: 800, color: "var(--text)" }}>{r.pts}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {view === "matches" && (
        <>
          {team && (
            <div className="flex items-center" style={{ gap: 8, marginTop: -4 }}>
              <span className="chip">
                <Flag flag={team.flag_emoji} name={team.name} size="sm" />
                {team.name}
              </span>
              <button
                type="button"
                onClick={() => setTeamId(null)}
                className="chip press"
                style={{ cursor: "pointer", color: "var(--text-3)" }}
              >
                <Icon name="x" size={12} sw={2.6} />
                Clear
              </button>
            </div>
          )}

          {days.length === 0 && (
            <div
              className="card flex flex-col items-center text-center"
              style={{ padding: "36px 20px", gap: 6 }}
            >
              <span className="t-h3">No results yet</span>
              <span className="t-sm" style={{ color: "var(--text-3)", maxWidth: 300 }}>
                Final scores land here automatically after each full-time whistle.
              </span>
            </div>
          )}

          {days.map(([k, ms]) => (
            <div key={k} className="flex flex-col" style={{ gap: 8 }}>
              <div className="t-label" style={{ color: "var(--text-3)" }}>
                {zonedDayLabel(ms[0].kickoff_at, tz)}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {ms.map((m, i) => {
                  const done = isFinished(m);
                  const homeName = m.home_team?.name ?? m.home_placeholder ?? "TBD";
                  const awayName = m.away_team?.name ?? m.away_placeholder ?? "TBD";
                  // Winner side: 0 = home, 1 = away, -1 = draw. A knockout carries
                  // a winner_team_id even when the 90' score is level (decided in
                  // extra time or on penalties), so a 1-1 shootout still highlights
                  // who actually advanced instead of looking like an open draw.
                  const winSide = !done
                    ? -1
                    : m.winner_team_id != null
                      ? m.winner_team_id === m.home_team_id
                        ? 0
                        : m.winner_team_id === m.away_team_id
                          ? 1
                          : -1
                      : m.home_score! > m.away_score!
                        ? 0
                        : m.home_score! < m.away_score!
                          ? 1
                          : -1;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center"
                      style={{
                        gap: 9,
                        padding: "11px 14px",
                        borderTop: i ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <Flag flag={m.home_team?.flag_emoji} name={homeName} size="sm" />
                      <span
                        className="truncate"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: done && winSide === 1 ? "var(--text-3)" : "var(--text)",
                        }}
                      >
                        {homeName}
                      </span>
                      {done ? (
                        <span
                          className="flex flex-col items-center"
                          style={{ gap: 1, whiteSpace: "nowrap" }}
                        >
                          <span
                            className="tnum"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 800,
                              fontSize: 16,
                              lineHeight: 1.05,
                            }}
                          >
                            {m.home_score}–{m.away_score}
                          </span>
                          {decidedNoteNamed(m, m.home_team?.code, m.away_team?.code) && (
                            <span
                              style={{ color: "var(--text-3)", fontSize: 10, fontWeight: 700 }}
                            >
                              {decidedNoteNamed(m, m.home_team?.code, m.away_team?.code)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="t-xs tnum" style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>
                          <LocalKickoff iso={m.kickoff_at} tz={tz} />
                        </span>
                      )}
                      <span
                        className="truncate"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 700,
                          fontSize: 13.5,
                          textAlign: "right",
                          color: done && winSide === 0 ? "var(--text-3)" : "var(--text)",
                        }}
                      >
                        {awayName}
                      </span>
                      <Flag flag={m.away_team?.flag_emoji} name={awayName} size="sm" />
                      <span
                        className="t-xs"
                        style={{ color: "var(--text-3)", width: 52, textAlign: "right", flex: "none" }}
                      >
                        {m.stage === "group" ? `Grp ${m.group_label}` : STAGE_LABELS[m.stage]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
