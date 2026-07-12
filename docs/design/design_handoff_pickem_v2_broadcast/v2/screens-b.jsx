/* v2 screens: Groups + Bracket */

/* ---------------- GROUPS ---------------- */
/* tap cycles: winner -> runner-up -> clear */
function GroupCard({ g, state, set }) {
  const pick = state.groupPicks[g] || {};
  const cycle = (code) => {
    const p = { ...pick };
    if (p.w === code) { p.w = p.r; p.r = code; }        // winner -> runner
    else if (p.r === code) { delete p.r; }               // runner -> clear
    else if (!p.w) p.w = code;
    else if (!p.r) p.r = code;
    else p.w = code;                                      // replace winner
    set({ groupPicks: { ...state.groupPicks, [g]: p } });
  };
  return (
    <div className="card">
      <div className="card-h">
        <span className="td" style={{ fontSize: 14 }}>Group {g}</span>
        <span className="t-xs mut3">{pick.w && pick.r ? "2 / 2 picked" : pick.w ? "1 / 2" : "tap to pick"}</span>
      </div>
      <div className="rows">
        {WC.groups[g].map((code) => {
          const t = WC.team(code);
          const tag = pick.w === code ? "w" : pick.r === code ? "r" : "o";
          return (
            <button key={code} className="grow" onClick={() => cycle(code)}>
              <Flag code={code} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13.5 }}>{code}</span>
              <span className="t-sm mut" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              <span className={"gtag " + tag}>{tag === "w" ? "1st" : tag === "r" ? "2nd" : "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GroupsScreen({ layout, state, set }) {
  const gs = Object.keys(WC.groups);
  const done = gs.filter((g) => state.groupPicks[g] && state.groupPicks[g].w && state.groupPicks[g].r).length;
  return (
    <div style={{ padding: layout === "desktop" ? 24 : "16px 16px 90px", maxWidth: 1180, margin: "0 auto" }}>
      <div className="sect" style={{ marginTop: 0 }}>
        <div>
          <div className="t-h1">Group stage picks</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>Pick a winner and runner-up in all 12 groups. Tap a team to cycle.</div>
        </div>
        <span className="pill pill-acc">{done} / 12 done</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: layout === "desktop" ? "repeat(3, 1fr)" : "1fr", gap: 16, marginTop: 16 }}>
        {gs.map((g) => <GroupCard key={g} g={g} state={state} set={set} />)}
      </div>
    </div>
  );
}

/* ---------------- BRACKET ---------------- */
const R32_PAIRS = [
  ["A", "w", "B", "r"], ["C", "w", "D", "r"], ["E", "w", "F", "r"], ["G", "w", "H", "r"],
  ["I", "w", "J", "r"], ["K", "w", "L", "r"], ["B", "w", "A", "r"], ["D", "w", "C", "r"],
  ["F", "w", "E", "r"], ["H", "w", "G", "r"], ["J", "w", "I", "r"], ["L", "w", "K", "r"],
];
const THIRD_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function thirdOf(g, picks) {
  const p = picks[g] || {};
  return WC.groups[g].find((c) => c !== p.w && c !== p.r) || null;
}

/* returns { rounds: [{name, matches:[[codeOrNull, codeOrNull]]}] } */
function buildBracket(state) {
  const gp = state.groupPicks, ko = state.koPicks;
  const r32 = R32_PAIRS.map(([g1, k1, g2, k2]) => [
    (gp[g1] || {})[k1] || null, (gp[g2] || {})[k2] || null,
  ]);
  for (let i = 0; i < 4; i++) {
    r32.push([thirdOf(THIRD_GROUPS[2 * i], gp), thirdOf(THIRD_GROUPS[2 * i + 1], gp)]);
  }
  const seeds32 = R32_PAIRS.map(([g1, k1, g2, k2]) => [`${g1}${k1 === "w" ? 1 : 2}`, `${g2}${k2 === "w" ? 1 : 2}`])
    .concat([0, 1, 2, 3].map((i) => [`${THIRD_GROUPS[2 * i]}3`, `${THIRD_GROUPS[2 * i + 1]}3`]));

  const rounds = [{ name: "Round of 32", key: "R32", matches: r32, seeds: seeds32 }];
  let prev = r32, prevKey = "R32";
  [["Round of 16", "R16"], ["Quarterfinals", "QF"], ["Semifinals", "SF"], ["Final", "F"]].forEach(([name, key]) => {
    const n = prev.length / 2;
    const matches = [];
    for (let i = 0; i < n; i++) {
      matches.push([ko[`${prevKey}-${2 * i}`] || null, ko[`${prevKey}-${2 * i + 1}`] || null]);
    }
    rounds.push({ name, key, matches });
    prev = matches; prevKey = key;
  });
  return rounds;
}

function BktNode({ rk, idx, pair, seeds, state, set }) {
  const picked = state.koPicks[`${rk}-${idx}`];
  const choose = (code) => {
    if (!code) return;
    const ko = { ...state.koPicks, [`${rk}-${idx}`]: code };
    // clear downstream picks that referenced the replaced team
    const order = ["R32", "R16", "QF", "SF", "F"];
    let k = order.indexOf(rk), i = idx;
    while (k < order.length - 1) {
      const nk = order[k + 1], ni = Math.floor(i / 2);
      const key = `${nk}-${ni}`;
      if (ko[key] && ko[key] !== code && (picked === ko[key])) delete ko[key];
      k++; i = ni;
    }
    set({ koPicks: ko });
  };
  return (
    <div className="bkt-node">
      {pair.map((code, i) => {
        const t = code ? WC.team(code) : null;
        return (
          <button key={i} className={"bkt-team" + (code && picked === code ? " pick" : "") + (code ? "" : " tbd")} onClick={() => choose(code)}>
            {code ? <Flag code={code} size="sm" /> : <span className="flag sm" style={{ opacity: 0.4 }} />}
            <span>{code || (seeds ? seeds[i] : "TBD")}</span>
            <span className="t-xs mut3">{t ? t.name : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

function BracketScreen({ layout, state, set }) {
  const rounds = buildBracket(state);
  const champ = state.koPicks["F-0"];
  return (
    <div style={{ padding: layout === "desktop" ? 24 : "16px 0 90px", maxWidth: layout === "desktop" ? 1180 : undefined, margin: "0 auto" }}>
      <div className="sect" style={{ margin: layout === "desktop" ? "0 0 14px" : "0 16px 14px" }}>
        <div>
          <div className="t-h1">Knockout bracket</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>Tap teams to advance them. Winners feed the next round.</div>
        </div>
        {champ && <span className="pill pill-pts" style={{ gap: 7 }}><Flag code={champ} size="sm" /> {WC.team(champ).name} to win it</span>}
      </div>
      <div className="hscroll" style={{ padding: layout === "desktop" ? 0 : "0 16px" }}>
        <div className="bkt" style={{ minWidth: 940, paddingBottom: 8 }}>
          {rounds.map((r) => (
            <div key={r.key} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="t-label" style={{ marginBottom: 8, color: "var(--ink-2)" }}>{r.name}</div>
              <div className="bkt-col" style={{ flex: 1 }}>
                {r.matches.map((pair, i) => (
                  <BktNode key={i} rk={r.key} idx={i} pair={pair} seeds={r.seeds && r.seeds[i]} state={state} set={set} />
                ))}
              </div>
            </div>
          ))}
          {/* champion column */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
            <div className="t-label" style={{ marginBottom: 8, color: "var(--ink-2)" }}>Champion</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div className="card" style={{ width: "100%", padding: 14, textAlign: "center", borderColor: champ ? "var(--gold)" : "var(--line)" }}>
                {champ ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <Flag code={champ} size="lg" />
                    <span className="td" style={{ fontSize: 17 }}>{WC.team(champ).name}</span>
                    <span className="pill pill-pts">+70 pts if right</span>
                  </div>
                ) : (
                  <span className="t-sm mut3">Pick through the rounds to crown a champion</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GroupsScreen, BracketScreen, buildBracket });
