/* ===========================================================
   Competitions registry — proves the UI adapts beyond WC26.
   Each competition declares its nav, fixtures, and standings;
   screens render from this config, not hardcoded WC data.
   Club crests are generic monogram badges (no copyrighted marks).
   =========================================================== */
(function () {
  const C = (code, name, bg, fg) => ({ code, name, bg, fg: fg || "#fff", club: true });
  const CLUBS = {
    ARS: C("ARS", "Arsenal", "#d0121f"),
    MCI: C("MCI", "Manchester City", "#6CABDD", "#10233c"),
    LIV: C("LIV", "Liverpool", "#C8102E"),
    CHE: C("CHE", "Chelsea", "#034694"),
    TOT: C("TOT", "Tottenham", "#132257"),
    MUN: C("MUN", "Manchester Utd", "#B7222C"),
    NEW: C("NEW", "Newcastle", "#241F20"),
    AVL: C("AVL", "Aston Villa", "#670E36"),
    BHA: C("BHA", "Brighton", "#0057B8"),
    WHU: C("WHU", "West Ham", "#7A263A"),
    RMA: C("RMA", "Real Madrid", "#f4f4f6", "#22315c"),
    BAR: C("BAR", "Barcelona", "#A50044"),
    BAY: C("BAY", "Bayern München", "#DC052D"),
    PSG: C("PSG", "Paris SG", "#004170"),
    INT: C("INT", "Inter", "#0B1B69"),
    JUV: C("JUV", "Juventus", "#17181c"),
    DOR: C("DOR", "Dortmund", "#FDE100", "#2a2405"),
    ATM: C("ATM", "Atlético Madrid", "#CB3524"),
    BEN: C("BEN", "Benfica", "#E30613"),
    MIL: C("MIL", "Milan", "#9d1218"),
  };

  const F = (id, home, away, iso, round, venue) =>
    ({ id, home, away, kickoff: Date.parse(iso), round, venue });

  /* nav: [screenKey, label, icon] — each comp declares its own */
  const COMPS = {
    wc26: {
      id: "wc26", name: "World Cup 2026", short: "WC 26", tag: "Jun – Jul 2026 · national teams",
      kind: "cup", lbNote: "Matchday 2 of 24",
      nav: [
        ["dashboard", "Matches", "matches"], ["groups", "Groups", "groups"],
        ["bracket", "Bracket", "bracket"], ["leaderboard", "Table", "trophy"],
      ],
    },
    epl: {
      id: "epl", name: "Premier League", short: "League", tag: "2026/27 · matchweek 8",
      kind: "league", lbNote: "Matchweek 8 of 38",
      nav: [
        ["dashboard", "Matches", "matches"], ["standings", "Standings", "table"],
        ["leaderboard", "Table", "trophy"],
      ],
      fixtures: [
        { id: "e0", home: "TOT", away: "CHE", kickoff: WC.NOW - 80 * 60000, round: "Matchweek 8", venue: "Tottenham Stadium · London", live: true, minute: 74, score: [2, 1] },
        F("e1", "ARS", "MCI", "2026-10-17T11:30:00Z", "Matchweek 8", "Emirates Stadium · London"),
        F("e2", "LIV", "MUN", "2026-10-17T16:30:00Z", "Matchweek 8", "Anfield · Liverpool"),
        F("e3", "NEW", "AVL", "2026-10-18T13:00:00Z", "Matchweek 8", "St James' Park · Newcastle"),
        F("e4", "BHA", "WHU", "2026-10-18T15:30:00Z", "Matchweek 8", "Amex Stadium · Brighton"),
      ],
      standings: [
        ["MCI", 7, 6, 1, 0, 14, 19], ["ARS", 7, 5, 2, 0, 11, 17], ["LIV", 7, 5, 1, 1, 9, 16],
        ["TOT", 7, 4, 1, 2, 5, 13], ["CHE", 7, 3, 2, 2, 2, 11], ["NEW", 7, 3, 1, 3, 0, 10],
        ["AVL", 7, 2, 2, 3, -2, 8], ["BHA", 7, 2, 1, 4, -4, 7], ["MUN", 7, 1, 2, 4, -6, 5],
        ["WHU", 7, 0, 1, 6, -10, 1],
      ],
      zones: [{ after: 4, label: "Champions League places" }, { after: 8, label: "Relegation zone", danger: true }],
      standingsTitle: "League table", standingsNote: "After matchweek 7",
    },
    ucl: {
      id: "ucl", name: "Champions League", short: "UCL", tag: "2026/27 · league phase",
      kind: "hybrid", lbNote: "League phase · matchday 3 of 8",
      nav: [
        ["dashboard", "Matches", "matches"], ["standings", "League phase", "table"],
        ["bracket", "Bracket", "bracket"], ["leaderboard", "Table", "trophy"],
      ],
      fixtures: [
        F("u1", "RMA", "INT", "2026-10-20T19:00:00Z", "Matchday 3", "Bernabéu · Madrid"),
        F("u2", "BAY", "PSG", "2026-10-20T19:00:00Z", "Matchday 3", "Allianz Arena · Munich"),
        F("u3", "BAR", "DOR", "2026-10-21T19:00:00Z", "Matchday 3", "Camp Nou · Barcelona"),
        F("u4", "ATM", "JUV", "2026-10-21T19:00:00Z", "Matchday 3", "Metropolitano · Madrid"),
        F("u5", "MCI", "BEN", "2026-10-21T19:00:00Z", "Matchday 3", "Etihad Stadium · Manchester"),
        F("u6", "LIV", "MIL", "2026-10-22T19:00:00Z", "Matchday 3", "Anfield · Liverpool"),
      ],
      standings: [
        ["RMA", 2, 2, 0, 0, 5, 6], ["BAY", 2, 2, 0, 0, 4, 6], ["LIV", 2, 1, 1, 0, 3, 4],
        ["INT", 2, 1, 1, 0, 2, 4], ["BAR", 2, 1, 1, 0, 1, 4], ["ATM", 2, 1, 0, 1, 0, 3],
        ["PSG", 2, 1, 0, 1, 0, 3], ["DOR", 2, 1, 0, 1, -1, 3], ["MCI", 2, 0, 2, 0, 0, 2],
        ["JUV", 2, 0, 1, 1, -2, 1], ["BEN", 2, 0, 1, 1, -2, 1], ["MIL", 2, 0, 0, 2, -4, 0],
      ],
      zones: [{ after: 8, label: "Straight to Round of 16" }],
      standingsTitle: "League phase", standingsNote: "36 clubs, single table · top 12 shown",
    },
  };

  window.CLUBS = CLUBS;
  window.COMPS = COMPS;
  window.teamOf = (c) => (window.WC && WC.teams[c]) || CLUBS[c] || { code: c, name: c };
})();
