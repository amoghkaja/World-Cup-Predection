/* ===========================================================
   World Cup Pick'em — mock data (plausible WC2026 setup)
   Plain JS — attaches to window.WC
   =========================================================== */
(function () {
  // ---- teams: code -> { name, flag } ------------------------------------
  const T = {
    USA: ["United States", "🇺🇸"], CAN: ["Canada", "🇨🇦"], MEX: ["Mexico", "🇲🇽"],
    ARG: ["Argentina", "🇦🇷"], BRA: ["Brazil", "🇧🇷"], FRA: ["France", "🇫🇷"],
    ENG: ["England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ESP: ["Spain", "🇪🇸"], GER: ["Germany", "🇩🇪"],
    POR: ["Portugal", "🇵🇹"], NED: ["Netherlands", "🇳🇱"], BEL: ["Belgium", "🇧🇪"],
    CRO: ["Croatia", "🇭🇷"], ITA: ["Italy", "🇮🇹"], URU: ["Uruguay", "🇺🇾"],
    COL: ["Colombia", "🇨🇴"], JPN: ["Japan", "🇯🇵"], KOR: ["South Korea", "🇰🇷"],
    SEN: ["Senegal", "🇸🇳"], MAR: ["Morocco", "🇲🇦"], SUI: ["Switzerland", "🇨🇭"],
    DEN: ["Denmark", "🇩🇰"], MEX2: ["", ""],
    AUS: ["Australia", "🇦🇺"], ECU: ["Ecuador", "🇪🇨"], GHA: ["Ghana", "🇬🇭"],
    POL: ["Poland", "🇵🇱"], SRB: ["Serbia", "🇷🇸"], CMR: ["Cameroon", "🇨🇲"],
    TUN: ["Tunisia", "🇹🇳"], WAL: ["Wales", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"], IRN: ["Iran", "🇮🇷"],
    QAT: ["Qatar", "🇶🇦"], KSA: ["Saudi Arabia", "🇸🇦"], CRC: ["Costa Rica", "🇨🇷"],
    NGA: ["Nigeria", "🇳🇬"], EGY: ["Egypt", "🇪🇬"], CIV: ["Ivory Coast", "🇨🇮"],
    PER: ["Peru", "🇵🇪"], CHI: ["Chile", "🇨🇱"], PAR: ["Paraguay", "🇵🇾"],
    SCO: ["Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"], NOR: ["Norway", "🇳🇴"], SWE: ["Sweden", "🇸🇪"],
    AUT: ["Austria", "🇦🇹"], TUR: ["Turkey", "🇹🇷"], UKR: ["Ukraine", "🇺🇦"],
    NZL: ["New Zealand", "🇳🇿"], JAM: ["Jamaica", "🇯🇲"], PAN: ["Panama", "🇵🇦"],
    ALG: ["Algeria", "🇩🇿"], DRC: ["DR Congo", "🇨🇩"], UZB: ["Uzbekistan", "🇺🇿"],
  };
  const teams = {};
  Object.keys(T).forEach(c => { if (T[c][0]) teams[c] = { code: c, name: T[c][0], flag: T[c][1] }; });

  // ---- groups A–L (4 teams each) ----------------------------------------
  const groups = {
    A: ["MEX", "POL", "URU", "KOR"],
    B: ["CAN", "BEL", "MAR", "JPN"],
    C: ["USA", "CRO", "SEN", "AUS"],
    D: ["ARG", "SUI", "GHA", "NZL"],
    E: ["FRA", "DEN", "TUN", "CRC"],
    F: ["BRA", "SRB", "CMR", "PAN"],
    G: ["ENG", "ECU", "EGY", "JAM"],
    H: ["ESP", "IRN", "NGA", "NOR"],
    I: ["GER", "COL", "CIV", "QAT"],
    J: ["POR", "PER", "ALG", "UZB"],
    K: ["NED", "CHI", "SCO", "KSA"],
    L: ["ITA", "PAR", "TUR", "DRC"],
  };

  // ---- "now" anchor for countdowns --------------------------------------
  // Tournament opens June 11 2026; we sit just before it for live demo feel.
  const NOW = new Date("2026-06-11T16:30:00Z");

  function dt(iso) { return new Date(iso).getTime(); }

  // ---- group-stage fixtures ---------------------------------------------
  // status derived live from kickoff vs NOW
  let mid = 1;
  const M = (home, away, kickoffISO, group, venue) => ({
    id: "m" + (mid++), home, away, kickoff: dt(kickoffISO), group, venue, round: "Group",
  });

  const matches = [
    // matchday around the demo "now"
    M("MEX", "POL", "2026-06-11T19:00:00Z", "A", "Estadio Azteca · Mexico City"),
    M("USA", "CRO", "2026-06-12T00:00:00Z", "C", "SoFi Stadium · Los Angeles"),
    M("CAN", "BEL", "2026-06-12T20:00:00Z", "B", "BMO Field · Toronto"),
    M("ARG", "SUI", "2026-06-13T19:00:00Z", "D", "MetLife Stadium · New Jersey"),
    M("FRA", "DEN", "2026-06-13T22:00:00Z", "E", "AT&T Stadium · Dallas"),
    M("BRA", "SRB", "2026-06-14T19:00:00Z", "F", "Hard Rock Stadium · Miami"),
    M("ENG", "ECU", "2026-06-14T22:00:00Z", "G", "Lincoln Financial · Philadelphia"),
    M("ESP", "IRN", "2026-06-15T19:00:00Z", "H", "Levi's Stadium · San Francisco"),
    M("GER", "COL", "2026-06-15T22:00:00Z", "I", "Lumen Field · Seattle"),
    M("POR", "PER", "2026-06-16T19:00:00Z", "J", "Arrowhead · Kansas City"),
    M("NED", "CHI", "2026-06-16T22:00:00Z", "K", "Gillette Stadium · Boston"),
    M("ITA", "PAR", "2026-06-17T19:00:00Z", "L", "NRG Stadium · Houston"),
    // a few that already kicked off (locked / finished) before NOW
    M("KOR", "URU", "2026-06-10T19:00:00Z", "A", "Estadio Azteca · Mexico City"),
    M("MAR", "JPN", "2026-06-10T22:00:00Z", "B", "BC Place · Vancouver"),
    M("SEN", "AUS", "2026-06-09T22:00:00Z", "C", "SoFi Stadium · Los Angeles"),
  ];

  // pre-recorded results for the finished ones
  const results = {
    m15: { home: 0, away: 2 }, // SEN 0-2 AUS
    m13: { home: 1, away: 1 }, // KOR 1-1 URU
  };

  // ---- the current user's existing predictions --------------------------
  // matchId -> { outcome:'H'|'D'|'A', hs, as }
  const predictions = {
    m1:  { outcome: "H", hs: 2, as: 0 },
    m2:  { outcome: "D", hs: 1, as: 1 },
    m4:  { outcome: "H", hs: 3, as: 1 },
    m13: { outcome: "A", hs: 0, as: 2 }, // finished -> wrong-ish
    m15: { outcome: "A", hs: 0, as: 1 },
  };

  // ---- leaderboard ------------------------------------------------------
  const leaderboard = [
    { id: "u1", name: "Marcus Boateng", pts: 268, acc: 71, picks: 38, avatar: "MB", hue: 160 },
    { id: "u2", name: "Priya Nair", pts: 254, acc: 68, picks: 38, avatar: "PN", hue: 280 },
    { id: "me", name: "You (Alex Rivera)", pts: 241, acc: 66, picks: 37, avatar: "AR", hue: 200, me: true },
    { id: "u4", name: "Tomás Herrera", pts: 233, acc: 63, picks: 38, avatar: "TH", hue: 30 },
    { id: "u5", name: "Lena Fischer", pts: 229, acc: 64, picks: 36, avatar: "LF", hue: 340 },
    { id: "u6", name: "Kofi Mensah", pts: 218, acc: 60, picks: 38, avatar: "KM", hue: 90 },
    { id: "u7", name: "Yuki Tanaka", pts: 205, acc: 58, picks: 35, avatar: "YT", hue: 220 },
    { id: "u8", name: "Sara Lindqvist", pts: 197, acc: 57, picks: 37, avatar: "SL", hue: 12 },
    { id: "u9", name: "Diego Costa", pts: 181, acc: 54, picks: 34, avatar: "DC", hue: 130 },
    { id: "u10", name: "Aisha Khan", pts: 174, acc: 55, picks: 36, avatar: "AK", hue: 300 },
  ];

  const me = {
    name: "Alex Rivera", handle: "@alexr", avatar: "AR", hue: 200,
    pts: 241, rank: 3, total: 10, acc: 66, correct: 24, picks: 37, streak: 4,
  };

  // ---- knockout bracket (seeded, mostly TBD) ----------------------------
  // We model winners/runners feeding R32. Demo state: open for picking.
  const bracket = {
    R32: [
      ["1A", "2B"], ["1C", "2D"], ["1E", "2F"], ["1G", "2H"],
      ["1I", "2J"], ["1K", "2L"], ["1B", "2A"], ["1D", "2C"],
      ["1F", "2E"], ["1H", "2G"], ["1J", "2I"], ["1L", "2K"],
      ["1A2", "2B2"], ["1C2", "2D2"], ["1E2", "2F2"], ["1G2", "2H2"],
    ],
  };

  // ---- points model -----------------------------------------------------
  const roundPoints = { Group: 10, R32: 15, R16: 20, QF: 30, SF: 45, Final: 70 };

  window.WC = {
    teams, groups, matches, results, predictions, leaderboard, me,
    bracket, roundPoints, NOW: NOW.getTime(),
    team: (c) => teams[c] || { code: c, name: c, flag: "🏳️" },
  };
})();
