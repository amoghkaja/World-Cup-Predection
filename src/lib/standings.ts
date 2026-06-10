import type { MatchWithTeams, Team } from "./types";

export interface StandingRow {
  team: Team;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface GroupTable {
  group: string;
  rows: StandingRow[];
}

/** Live group tables computed from finished group games (FIFA tiebreakers: pts, GD, GF). */
export function groupStandings(teams: Team[], matches: MatchWithTeams[]): GroupTable[] {
  const rows = new Map<number, StandingRow>();
  for (const t of teams) {
    if (t.group_label) rows.set(t.id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  }

  for (const m of matches) {
    if (m.stage !== "group" || m.status !== "final" || m.home_score == null || m.away_score == null)
      continue;
    const h = m.home_team_id != null ? rows.get(m.home_team_id) : undefined;
    const a = m.away_team_id != null ? rows.get(m.away_team_id) : undefined;
    if (!h || !a) continue;
    h.p++;
    a.p++;
    h.gf += m.home_score;
    h.ga += m.away_score;
    a.gf += m.away_score;
    a.ga += m.home_score;
    if (m.home_score > m.away_score) {
      h.w++;
      a.l++;
      h.pts += 3;
    } else if (m.home_score < m.away_score) {
      a.w++;
      h.l++;
      a.pts += 3;
    } else {
      h.d++;
      a.d++;
      h.pts++;
      a.pts++;
    }
  }

  const byGroup = new Map<string, StandingRow[]>();
  for (const r of rows.values()) {
    const g = r.team.group_label!;
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }
  return [...byGroup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, rs]) => ({
      group,
      rows: rs.sort(
        (x, y) =>
          y.pts - x.pts ||
          y.gf - y.ga - (x.gf - x.ga) ||
          y.gf - x.gf ||
          x.team.name.localeCompare(y.team.name)
      ),
    }));
}
