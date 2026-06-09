/* ===========================================================
   Screens — My Predictions, Knockout Bracket, Group Predictions
   =========================================================== */

/* ---------------- MY PREDICTIONS ---------------- */
function MyPredictions() {
  const { now, predictions, device } = useApp();
  const [tab, setTab] = useState("all"); // all | settled | pending

  const mine = useMemo(() => WC.matches
    .filter(m => predictions[m.id])
    .sort((a, b) => b.kickoff - a.kickoff), [predictions]);

  const list = mine.filter(m => {
    const settled = !!WC.results[m.id];
    if (tab === "settled") return settled;
    if (tab === "pending") return !settled;
    return true;
  });

  // group by day
  const days = useMemo(() => {
    const map = {};
    list.forEach(m => { (map[dayKey(m.kickoff)] = map[dayKey(m.kickoff)] || []).push(m); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  const settled = mine.filter(m => WC.results[m.id]);
  const earned = settled.reduce((s, m) => s + pointsEarned(m, predictions[m.id]), 0);
  const hits = settled.filter(m => {
    const r = WC.results[m.id], p = predictions[m.id];
    const out = r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
    return p.outcome === out;
  }).length;

  return (<div className="screen-pad">
    <SectionHeader title="My Predictions" sub="Your full pick history, points earned, and pending calls." />

    {/* summary cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
      {[["Points banked", earned, "bolt", "gold"], ["Correct results", `${hits}/${settled.length || 0}`, "target", ""], ["Pending picks", mine.length - settled.length, "clock", ""]].map(([l, v, ic, k]) => (
        <div key={l} className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: k === "gold" ? "var(--gold-strong)" : "var(--text-3)", marginBottom: 8 }}>
            <Icon name={ic} size={16} /><span className="t-label">{l}</span></div>
          <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28,
            color: k === "gold" ? "var(--gold-strong)" : "var(--text)" }}>{v}</div>
        </div>))}
    </div>

    <div className="seg" style={{ marginBottom: 16 }}>
      {[["all", "All"], ["settled", "Settled"], ["pending", "Pending"]].map(([k, l]) =>
        <button key={k} className={cx("seg-btn", tab === k && "on")} onClick={() => setTab(k)}>{l}</button>)}
    </div>

    {days.length === 0 && <EmptyState icon="list" title="No predictions yet" body="Head to the dashboard and lock in your first calls before kickoff." />}

    {days.map(([dk, ms]) => (<div key={dk} style={{ marginBottom: 18 }}>
      <div className="t-label" style={{ color: "var(--text-3)", marginBottom: 8 }}>{fmtDay(ms[0].kickoff)}</div>
      <div className="card" style={{ overflow: "hidden" }}>
        {ms.map(m => <CompactPredictionRow key={m.id} m={m} now={now} pred={predictions[m.id]} />)}
      </div>
    </div>))}
  </div>);
}

/* ============================================================
   KNOCKOUT BRACKET — interactive R32 → Final
   ============================================================ */
// 32 seeded teams in bracket order (top half then bottom half).
const BRACKET_SEED = [
  "ARG", "AUS", "ESP", "CRO", "FRA", "JPN", "BRA", "KOR",
  "ENG", "SEN", "NED", "MEX", "POR", "MAR", "GER", "URU",
  "USA", "DEN", "BEL", "COL", "ITA", "ECU", "SUI", "POL",
  "CHI", "NGA", "PER", "SRB", "TUR", "CMR", "NOR", "PAR",
];
const ROUND_DEF = [
  { key: "R32", label: "Round of 32", n: 16 },
  { key: "R16", label: "Round of 16", n: 8 },
  { key: "QF", label: "Quarter-finals", n: 4 },
  { key: "SF", label: "Semi-finals", n: 2 },
  { key: "Final", label: "Final", n: 1 },
];
// which R32 matches are already locked (kicked off) in the demo
const LOCKED_R32 = { 0: ["ARG", 1], 1: ["ESP", 2] }; // matchIndex -> [winnerCode, resultFlag]

function KnockoutBracket() {
  const { now } = useApp();
  const toast = useToast();
  // picks[roundKey][matchIndex] = winning team code
  const [picks, setPicks] = useState(() => {
    const init = { R32: {}, R16: {}, QF: {}, SF: {}, Final: {} };
    Object.entries(LOCKED_R32).forEach(([i, [code]]) => { init.R32[i] = code; });
    return init;
  });

  // build round teams: R32 from seed, later rounds from prior picks
  const rounds = useMemo(() => {
    const r32 = [];
    for (let i = 0; i < 16; i++) r32.push([BRACKET_SEED[i * 2], BRACKET_SEED[i * 2 + 1]]);
    const out = { R32: r32 };
    let prev = r32, prevKey = "R32";
    ["R16", "QF", "SF", "Final"].forEach(key => {
      const cnt = prev.length / 2;
      const arr = [];
      for (let i = 0; i < cnt; i++) {
        const a = picks[prevKey][i * 2], b = picks[prevKey][i * 2 + 1];
        arr.push([a || null, b || null]);
      }
      out[key] = arr; prev = arr; prevKey = key;
    });
    return out;
  }, [picks]);

  const pick = (roundKey, mi, code) => {
    if (!code) return;
    if (roundKey === "R32" && LOCKED_R32[mi]) return; // locked
    setPicks(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[roundKey][mi] = code;
      // clear downstream picks that depended on the replaced slot
      const order = ["R32", "R16", "QF", "SF", "Final"];
      let ri = order.indexOf(roundKey);
      let slot = mi;
      for (let k = ri + 1; k < order.length; k++) {
        const parent = Math.floor(slot / 2);
        // if the advanced team at this slot is no longer valid, clear
        next[order[k]][parent] = next[order[k]][parent];
        slot = parent;
      }
      return next;
    });
    if (roundKey !== "Final") toast(`${team(code).name} advance`, { icon: "check" });
    else toast(`${team(code).name} — your champion!`, { icon: "trophy", kind: "gold" });
  };

  const champion = picks.Final[0];
  const totalPicks = Object.values(picks).reduce((s, r) => s + Object.keys(r).length, 0);

  return (<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "20px clamp(16px,4vw,30px) 12px", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <SectionHeader title="Knockout bracket"
        sub="Tap a team to send them through. Scroll right to build all the way to the final."
        right={<div className="chip" style={{ background: champion ? "var(--gold-soft)" : "var(--surface-2)" }}>
          <Icon name="trophy" size={15} style={{ color: "var(--gold-strong)" }} />
          {champion ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Flag code={champion} size="sm" />{team(champion).name}</span>
            : <span style={{ color: "var(--text-3)" }}>No champion yet</span>}</div>} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span className="pill pill-open"><Icon name="unlock" size={12} sw={2.4} />{totalPicks - Object.keys(LOCKED_R32).length} picks made</span>
        <span className="pill pill-locked"><Icon name="lock" size={12} sw={2.4} />{Object.keys(LOCKED_R32).length} locked</span>
      </div>
    </div>

    {/* horizontally scrollable bracket */}
    <div className="scroll" style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "8px clamp(16px,4vw,30px) 40px" }}>
      <div style={{ display: "flex", gap: 22, minWidth: "min-content", alignItems: "stretch" }}>
        {ROUND_DEF.map((rd) => (
          <div key={rd.key} style={{ display: "flex", flexDirection: "column", minWidth: 184, width: 184 }}>
            <div className="t-label" style={{ color: "var(--text-3)", marginBottom: 12, textAlign: "center",
              position: "sticky", top: 0 }}>{rd.label}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 14 }}>
              {rounds[rd.key].map((pair, mi) => {
                const locked = rd.key === "R32" && !!LOCKED_R32[mi];
                const winner = picks[rd.key][mi];
                const result = locked ? LOCKED_R32[mi][1] : 0;
                return <BracketNode key={mi} pair={pair} winner={winner} locked={locked} isFinal={rd.key === "Final"}
                  onPick={(code) => pick(rd.key, mi, code)} />;
              })}
            </div>
          </div>))}

        {/* champion column */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 172, width: 172, justifyContent: "center" }}>
          <div className="t-label" style={{ color: "var(--gold-strong)", marginBottom: 12, textAlign: "center" }}>Champion</div>
          <div className="card" style={{ padding: 18, textAlign: "center", background: champion ? "var(--gold-soft)" : "var(--surface)",
            border: champion ? "1px solid var(--gold)" : "1px dashed var(--line-strong)" }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>{champion ? team(champion).flag : "🏆"}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: champion ? "var(--on-gold)" : "var(--text-3)" }}>
              {champion ? team(champion).name : "Build your bracket"}</div>
            {champion && <div className="t-xs" style={{ color: "var(--on-gold)", opacity: .8, marginTop: 4 }}>70 pts if they lift it</div>}
          </div>
        </div>
      </div>
    </div>
  </div>);
}

function BracketNode({ pair, winner, locked, isFinal, onPick }) {
  const row = (code, slot) => {
    const empty = !code;
    const won = winner && winner === code;
    const dim = winner && winner !== code;
    return (<button key={slot} disabled={empty || locked} onClick={() => onPick(code)}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        border: "none", borderTop: slot ? "1px solid var(--line)" : "none", padding: "9px 11px",
        background: won ? "var(--brand-soft)" : "transparent", cursor: empty || locked ? "default" : "pointer",
        opacity: dim ? 0.45 : 1, transition: "background .15s, opacity .15s", borderRadius: 0 }}>
      {empty ? <span className="flag sm" style={{ background: "var(--surface-2)", color: "var(--text-3)", fontSize: 11 }}>?</span>
        : <Flag code={code} size="sm" />}
      <span style={{ fontWeight: won ? 800 : 700, fontSize: 13.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        color: empty ? "var(--text-3)" : "var(--text)" }}>{empty ? "TBD" : team(code).name}</span>
      {won && <Icon name={isFinal ? "trophy" : "check"} size={14} sw={2.6} style={{ color: isFinal ? "var(--gold-strong)" : "var(--brand)", flex: "none" }} />}
    </button>);
  };
  return (<div className="card" style={{ overflow: "hidden", padding: 0, boxShadow: "var(--shadow-sm)",
    borderColor: locked ? "var(--line)" : winner ? "var(--brand-ring)" : "var(--line)" }}>
    {locked && <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", background: "var(--surface-2)",
      borderBottom: "1px solid var(--line)", color: "var(--text-3)" }}><Icon name="lock" size={11} sw={2.4} /><span className="t-xs" style={{ fontWeight: 700 }}>Final · locked</span></div>}
    {row(pair[0], 0)}
    {row(pair[1], 1)}
  </div>);
}

/* ============================================================
   GROUP PREDICTIONS — winner + runner-up for each group A–L
   ============================================================ */
function GroupPredictions() {
  const { device } = useApp();
  const toast = useToast();
  const desktop = device === "desktop";
  // picks[group] = { first: code, second: code }
  const [picks, setPicks] = useState({
    A: { first: "MEX", second: "URU" },
    C: { first: "USA", second: "CRO" },
  });

  const setSlot = (g, slot, code) => {
    setPicks(prev => {
      const cur = { ...(prev[g] || {}) };
      // toggling: if same slot already this code, clear; if other slot has it, swap
      if (cur[slot] === code) { cur[slot] = null; }
      else {
        const other = slot === "first" ? "second" : "first";
        if (cur[other] === code) cur[other] = null;
        cur[slot] = code;
      }
      return { ...prev, [g]: cur };
    });
  };

  const done = Object.values(picks).filter(p => p && p.first && p.second).length;

  return (<div className="screen-pad">
    <SectionHeader title="Group predictions"
      sub="Call the top two in each group. Correct winner = 8 pts, runner-up = 5 pts."
      right={<div className="chip"><Icon name="grid" size={14} style={{ color: "var(--brand)" }} />{done}/12 set</div>} />

    {/* progress bar */}
    <div style={{ height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden", marginBottom: 22, border: "1px solid var(--line)" }}>
      <div style={{ height: "100%", width: `${(done / 12) * 100}%`, background: "var(--brand)", borderRadius: 99, transition: "width .4s cubic-bezier(.2,.8,.3,1)" }} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 14 }}>
      {Object.entries(WC.groups).map(([g, codes]) => {
        const p = picks[g] || {};
        const complete = p.first && p.second;
        return (<div key={g} className="card" style={{ padding: 0, overflow: "hidden",
          borderColor: complete ? "var(--brand-ring)" : "var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
            background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: "var(--brand)", color: "var(--on-brand)",
                display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{g}</span>
              <span className="t-h3">Group {g}</span>
            </div>
            {complete
              ? <span className="pill pill-done"><Icon name="check" size={12} sw={3} />Set</span>
              : <span className="pill pill-open">Pick 2</span>}
          </div>
          <div style={{ padding: "6px 10px 10px" }}>
            {/* column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px", alignItems: "center", padding: "6px 6px 4px" }}>
              <span />
              <span className="t-xs" style={{ textAlign: "center", color: "var(--gold-strong)", fontWeight: 800 }}>1st</span>
              <span className="t-xs" style={{ textAlign: "center", color: "var(--text-3)", fontWeight: 800 }}>2nd</span>
            </div>
            {codes.map(code => {
              const isFirst = p.first === code, isSecond = p.second === code;
              return (<div key={code} style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px", alignItems: "center",
                padding: "5px 6px", borderRadius: 10,
                background: (isFirst || isSecond) ? "var(--brand-soft)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <Flag code={code} size="sm" />
                  <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team(code).name}</span>
                </div>
                <PosToggle on={isFirst} kind="first" onClick={() => setSlot(g, "first", code)} />
                <PosToggle on={isSecond} kind="second" onClick={() => setSlot(g, "second", code)} />
              </div>);
            })}
          </div>
        </div>);
      })}
    </div>
  </div>);
}

function PosToggle({ on, kind, onClick }) {
  const gold = kind === "first";
  return (<div style={{ display: "grid", placeItems: "center" }}>
    <button onClick={onClick} aria-label={kind}
      style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center",
        border: on ? "none" : "1.5px solid var(--line-strong)",
        background: on ? (gold ? "var(--gold)" : "var(--brand)") : "transparent",
        color: on ? (gold ? "var(--on-gold)" : "var(--on-brand)") : "var(--text-3)", transition: "all .15s" }}>
      {on ? <Icon name="check" size={17} sw={3} /> : <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--line-strong)" }} />}
    </button>
  </div>);
}

Object.assign(window, { MyPredictions, KnockoutBracket, GroupPredictions });
