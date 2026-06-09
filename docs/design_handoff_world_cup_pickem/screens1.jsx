/* ===========================================================
   Screens — Login, Dashboard, Match Detail
   =========================================================== */

/* ---------------- LOGIN ---------------- */
function FlagMarquee({ light }) {
  const codes = Object.keys(WC.teams);
  const row = codes.concat(codes); // duplicate for seamless loop
  return (<div className="marquee-mask" style={{ width: "100%", overflow: "hidden" }}>
    <div className="marquee-track">
      {row.map((c, i) => (<span key={i} title={WC.team(c).name} style={{ width: 38, height: 38, borderRadius: "50%", flex: "none",
        display: "grid", placeItems: "center", fontSize: 21, lineHeight: 1,
        background: light ? "rgba(255,255,255,0.12)" : "var(--surface-2)",
        border: light ? "1px solid rgba(255,255,255,0.18)" : "1px solid var(--line)",
        color: light ? "#fff" : "var(--text)", fontWeight: 700 }}>{WC.team(c).flag}</span>))}
    </div>
  </div>);
}

function LoginScreen() {
  const { go, device } = useApp();
  const desktop = device === "desktop";
  const heroBg = "linear-gradient(158deg, oklch(0.37 0.092 156), oklch(0.26 0.07 164))";
  return (<div style={{ height: "100%", display: "grid", gridTemplateColumns: desktop ? "1.05fr 1fr" : "1fr" }}>
    {/* hero panel */}
    <div style={{ position: "relative", overflow: "hidden", background: heroBg, color: "#f3fff9",
      display: desktop ? "flex" : "none", flexDirection: "column", justifyContent: "space-between", padding: "48px 48px 36px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }} className="trirule" />
      <PitchLines />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, fontWeight: 800 }}>
        <Logo light /> </div>
      <div style={{ position: "relative" }}>
        <div className="t-label" style={{ opacity: .82, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          FIFA World Cup 2026 <span style={{ fontSize: 16, letterSpacing: 3 }}>🇺🇸 🇨🇦 🇲🇽</span></div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 56, lineHeight: .98, letterSpacing: "-0.03em" }}>
          Call the<br />tournament.</div>
        <p style={{ fontSize: 17, opacity: .85, maxWidth: 420, marginTop: 18, lineHeight: 1.5 }}>
          Predict every match, climb the bracket, and out-score your friends across all 104 games.</p>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", gap: 28 }}>
          {[["104", "matches"], ["48", "teams"], ["16", "host cities"]].map(([n, l]) => (            <div key={l}><div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30 }}>{n}</div>
              <div className="t-xs" style={{ opacity: .75 }}>{l}</div></div>))}
        </div>
        <FlagMarquee light />
      </div>
    </div>

    {/* form panel */}
    <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      padding: desktop ? 48 : "0 26px", background: "var(--bg)", overflow: "hidden" }}>
      {!desktop && <PitchLines mobile />}
      <div style={{ position: "relative", width: "100%", maxWidth: 360, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ marginBottom: 26 }}><Logo /></div>
        {!desktop && (<>
          <div style={{ fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            Call the tournament.</div>
          <p className="t-body" style={{ color: "var(--text-2)", marginTop: 10, marginBottom: 4 }}>
            Predict every World Cup 2026 match and out-score your friends.</p>
          <div style={{ fontSize: 28, margin: "18px 0 6px", letterSpacing: 6 }}>🇺🇸 🇨🇦 🇲🇽</div>
        </>)}
        <button className="btn press" style={{ width: "100%", marginTop: 24, padding: "15px", background: "var(--surface)",
          color: "var(--text)", border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-sm)", fontSize: 16 }}
          onClick={() => go("dashboard")}>
          <Icon name="google" size={20} />Continue with Google</button>
        <div className="t-xs" style={{ color: "var(--text-3)", marginTop: 18, maxWidth: 280 }}>
          By continuing you agree to play fair. Predictions lock at each match kickoff.</div>
        {!desktop && <div style={{ marginTop: 26, width: "100%" }}><FlagMarquee /></div>}
      </div>
    </div>
  </div>);
}

function Logo({ light }) {
  return (<div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center",
      background: light ? "var(--on-brand)" : "var(--brand)", color: light ? "var(--brand-strong)" : "var(--on-brand)",
      boxShadow: "var(--shadow-sm)" }}>
      <Icon name="trophy" size={23} sw={2} /></div>
    <div style={{ textAlign: "left", lineHeight: 1 }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em",
        color: light ? "var(--on-brand)" : "var(--text)" }}>Pick&rsquo;em</div>
      <div className="t-xs" style={{ opacity: light ? .8 : 1, color: light ? "var(--on-brand)" : "var(--text-3)", fontWeight: 700, letterSpacing: ".04em" }}>WORLD CUP 2026</div>
    </div>
  </div>);
}

function PitchLines({ mobile }) {
  return (<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: mobile ? 0.04 : 0.13,
    color: mobile ? "var(--brand)" : "var(--on-brand)" }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 600">
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="200" cy="300" r="80" /><line x1="0" y1="300" x2="400" y2="300" />
      <rect x="120" y="-60" width="160" height="120" rx="2" /><rect x="120" y="540" width="160" height="120" rx="2" />
      <rect x="160" y="-60" width="80" height="60" /><rect x="160" y="600" width="80" height="60" />
    </g></svg>);
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard() {
  const { go, now, predictions, savePrediction, device } = useApp();
  const [filter, setFilter] = useState("all");
  const desktop = device === "desktop";

  const sorted = useMemo(() => [...WC.matches].sort((a, b) => a.kickoff - b.kickoff), []);
  const list = sorted.filter(m => {
    const st = matchStatus(m, now);
    if (filter === "open") return st === "open";
    if (filter === "mine") return !!predictions[m.id];
    if (filter === "all") return true;
    return true;
  });

  // group by day
  const days = useMemo(() => {
    const map = {};
    list.forEach(m => { (map[dayKey(m.kickoff)] = map[dayKey(m.kickoff)] || []).push(m); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const openCount = sorted.filter(m => matchStatus(m, now) === "open").length;
  const predictedOpen = sorted.filter(m => matchStatus(m, now) === "open" && predictions[m.id]).length;

  const tabs = [["all", "All"], ["open", "Open"], ["mine", "My picks"]];

  return (<div className="screen-pad">
    {/* greeting + stat band */}
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
      <div>
        <div className="t-label" style={{ color: "var(--text-3)" }}>Matchday · {fmtDay(now)}</div>
        <h1 className="t-h1" style={{ marginTop: 4 }}>Hey Alex</h1>
      </div>
      <div className="card" style={{ display: "flex", padding: "10px 4px", boxShadow: "none", background: "var(--surface-2)" }}>
        {[["#3", "Rank"], ["241", "Points"], [`${openCount - predictedOpen}`, "To pick"]].map(([n, l], i) => (
          <div key={l} style={{ padding: "0 18px", textAlign: "center", borderLeft: i ? "1px solid var(--line)" : "none" }}>
            <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22,
              color: l === "To pick" && (openCount - predictedOpen) > 0 ? "var(--gold-strong)" : "var(--text)" }}>{n}</div>
            <div className="t-xs" style={{ color: "var(--text-3)" }}>{l}</div></div>))}
      </div>
    </div>

    {/* champion call-to-action banner */}
    <button onClick={() => go("tournament")} style={{ width: "100%", textAlign: "left", border: "none", marginBottom: 18,
      background: "var(--brand)", color: "var(--on-brand)", borderRadius: "var(--radius)", padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-md)", position: "relative", overflow: "hidden" }}>
      <PitchLines />
      <div style={{ position: "relative", width: 44, height: 44, borderRadius: 13, background: "var(--gold)", color: "var(--on-gold)", display: "grid", placeItems: "center", flex: "none" }}>
        <Icon name="trophy" size={24} /></div>
      <div style={{ position: "relative", flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Pick your Champion</div>
        <div style={{ fontSize: 13, opacity: .85 }}>Tournament picks lock at first kickoff — earn the biggest bonus.</div></div>
      <Icon name="chevR" size={22} style={{ position: "relative", opacity: .9 }} />
    </button>

    {/* filter tabs */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
      <div className="seg">
        {tabs.map(([k, l]) => (<button key={k} className={cx("seg-btn", filter === k && "on")} onClick={() => setFilter(k)}>{l}
          {k === "open" && <span className="seg-count">{openCount}</span>}</button>))}
      </div>
    </div>

    {/* day groups */}
    {days.length === 0 && <EmptyState title="No matches here" body="Try a different filter — your open matches will appear as kickoff approaches." />}
    {days.map(([dk, ms], di) => (<div key={dk} style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <span className="t-h3">{fmtDay(ms[0].kickoff)}</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span className="t-xs" style={{ color: "var(--text-3)" }}>{ms.length} match{ms.length > 1 ? "es" : ""}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 13 }}>
        {ms.map((m, mi) => <div key={m.id} className="anim-up" style={{ animationDelay: `${Math.min(0.06 * mi + 0.03 * di, 0.4)}s` }}>
          <MatchCard m={m} now={now} prediction={predictions[m.id]}
            onSave={savePrediction} onOpen={(id) => go("match", { id })} /></div>)}
      </div>
    </div>))}
  </div>);
}

/* ---------------- MATCH DETAIL ---------------- */
function MatchDetail() {
  const { go, now, predictions, savePrediction, params } = useApp();
  const m = WC.matches.find(x => x.id === params.id) || WC.matches[0];
  const status = matchStatus(m, now);
  const open = status === "open";
  const existing = predictions[m.id];
  const [draft, setDraft] = useState(existing || { outcome: "H", hs: 1, as: 1 });
  const toast = useToast();
  const base = WC.roundPoints[m.round];
  const maxPts = base + Math.round(base * 0.8);
  const deriveOutcome = (hs, as) => (hs > as ? "H" : hs < as ? "A" : "D");

  const save = () => {
    savePrediction(m.id, { ...draft });
    toast(`Locked in ${team(m.home).code} ${draft.hs}–${draft.as} ${team(m.away).code}`, { icon: "check", kind: "gold" });
    go("dashboard");
  };

  return (<div className="screen-pad" style={{ maxWidth: 620, margin: "0 auto" }}>
    <button className="btn btn-ghost" style={{ padding: "8px 14px", marginBottom: 16 }} onClick={() => go("dashboard")}>
      <Icon name="chevL" size={16} />Back</button>

    {/* hero */}
    <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
        <span className="t-sm" style={{ fontWeight: 700, color: "var(--text-2)" }}>Group {m.group} · {m.round} stage</span>
        <StatusPill status={status} predicted={!!existing} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, padding: "26px 18px 8px" }}>
        <div style={{ textAlign: "center" }}><Flag code={m.home} size="lg" /><div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>{team(m.home).name}</div></div>
        <div className="t-label" style={{ color: "var(--text-3)" }}>vs</div>
        <div style={{ textAlign: "center" }}><Flag code={m.away} size="lg" /><div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>{team(m.away).name}</div></div>
      </div>
      <div className="t-sm" style={{ textAlign: "center", color: "var(--text-3)", paddingBottom: 18 }}>{m.venue}</div>
      <div style={{ padding: "18px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div className="t-label" style={{ color: open ? "var(--brand-strong)" : "var(--text-3)" }}>
          {open ? "Prediction locks in" : "Prediction locked"}</div>
        {open ? <Countdown to={m.kickoff} now={now} variant="big" />
          : <div className="t-h2" style={{ color: "var(--text-3)" }}>Kickoff has passed</div>}
      </div>
    </div>

    {/* prediction form */}
    <div className="card" style={{ padding: 18, marginBottom: 16 }}>
      <SectionHeader title="Your prediction" sub={open ? "Pick the outcome and exact score." : "This match is locked."} />
      <OutcomeToggle value={draft.outcome} disabled={!open}
        onChange={o => setDraft(d => ({ ...d, outcome: o }))} home={team(m.home).name} away={team(m.away).name} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, margin: "22px 0 6px" }}>
        <div style={{ textAlign: "center" }}>
          <Flag code={m.home} /><div className="t-xs" style={{ color: "var(--text-3)", margin: "6px 0 8px", fontWeight: 700 }}>{team(m.home).code}</div>
          <ScoreStepper value={draft.hs} disabled={!open} accent="var(--brand)"
            onChange={hs => setDraft(d => ({ ...d, hs, outcome: deriveOutcome(hs, d.as) }))} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "var(--line-strong)", marginTop: 20 }}>:</span>
        <div style={{ textAlign: "center" }}>
          <Flag code={m.away} /><div className="t-xs" style={{ color: "var(--text-3)", margin: "6px 0 8px", fontWeight: 700 }}>{team(m.away).code}</div>
          <ScoreStepper value={draft.as} disabled={!open} accent="var(--brand)"
            onChange={as => setDraft(d => ({ ...d, as, outcome: deriveOutcome(d.hs, as) }))} />
        </div>
      </div>
    </div>

    {/* points hint */}
    <div className="card" style={{ padding: 18, marginBottom: 16, background: "var(--gold-soft)", border: "1px solid transparent" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Icon name="bolt" size={20} style={{ color: "var(--gold-strong)" }} />
        <div className="t-h3" style={{ color: "var(--on-gold)" }}>Up to {maxPts} pts on offer</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[[`Correct result (Home / Draw / Away)`, `${base} pts`], [`Exact score bonus`, `+${Math.round(base * 0.8)} pts`]].map(([l, r]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--on-gold)" }}>
            <span style={{ opacity: .85 }}>{l}</span><b className="tnum">{r}</b></div>))}
      </div>
      <div className="t-xs" style={{ color: "var(--on-gold)", opacity: .8, marginTop: 12, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <Icon name="lock" size={13} style={{ marginTop: 1, flex: "none" }} />
        Your prediction locks the instant the match kicks off — no edits after that.</div>
      <button onClick={() => go("scoring")} style={{ marginTop: 12, width: "100%", border: "none", borderRadius: 12,
        background: "var(--on-gold)", color: "var(--gold-soft)", padding: "10px", fontWeight: 800, fontSize: 13.5,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer" }}>
        <Icon name="spark" size={15} />See how all points work<Icon name="chevR" size={15} /></button>
    </div>

    {open && <button className="btn btn-primary" style={{ width: "100%", padding: 16, fontSize: 16 }} onClick={save}>
      <Icon name="check" size={19} sw={2.6} />{existing ? "Update prediction" : "Lock in prediction"}</button>}
  </div>);
}

Object.assign(window, { LoginScreen, Dashboard, MatchDetail, Logo, PitchLines, FlagMarquee });
