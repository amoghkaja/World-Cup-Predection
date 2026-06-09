/* ===========================================================
   Screen — How Scoring Works (points table & explainer)
   =========================================================== */
function HowScoring() {
  const { device } = useApp();
  const desktop = device === "desktop";

  // round base points (from data) + exact-score bonus = 80% of base
  const rounds = [
    { k: "Group", label: "Group stage", base: WC.roundPoints.Group },
    { k: "R32", label: "Round of 32", base: WC.roundPoints.R32 },
    { k: "R16", label: "Round of 16", base: WC.roundPoints.R16 },
    { k: "QF", label: "Quarter-final", base: WC.roundPoints.QF },
    { k: "SF", label: "Semi-final", base: WC.roundPoints.SF },
    { k: "Final", label: "Final", base: WC.roundPoints.Final },
  ];
  const maxTotal = Math.max(...rounds.map(r => r.base + Math.round(r.base * 0.8)));

  const ways = [
    { icon: "target", soft: "var(--brand-soft)", on: "var(--brand-strong)", title: "Match result", desc: "Call Home, Draw or Away", pts: "10–70 pts" },
    { icon: "bolt", soft: "var(--gold-soft)", on: "var(--on-gold)", title: "Exact score", desc: "Nail the precise scoreline", pts: "+80% bonus" },
    { icon: "trophy", soft: "var(--red-soft)", on: "var(--red-strong)", title: "Tournament bets", desc: "Champion, finalists & more", pts: "up to 70" },
  ];

  const sidebets = [
    { icon: "grid", t: "Group winner", d: "Top of the group", pts: 8 },
    { icon: "grid", t: "Group runner-up", d: "Second place", pts: 5 },
    { icon: "trophy", t: "Champion", d: "Lifts the trophy", pts: 70 },
    { icon: "medal", t: "Other finalist", d: "Runner-up of the final", pts: 40 },
    { icon: "bolt", t: "Golden Boot", d: "Top scorer's nation", pts: 30 },
  ];

  return (<div className="screen-pad" style={{ maxWidth: 760, margin: "0 auto" }}>
    {/* hero */}
    <div className="card anim-up" style={{ overflow: "hidden", marginBottom: 18 }}>
      <div className="trirule" />
      <div style={{ padding: desktop ? "26px 26px 22px" : "22px 18px 18px" }}>
        <div className="t-label" style={{ color: "var(--text-3)", marginBottom: 8 }}>Scoring guide</div>
        <h1 className="t-h1" style={{ fontSize: desktop ? 32 : 26 }}>How points work</h1>
        <p className="t-body" style={{ color: "var(--text-2)", marginTop: 8, maxWidth: 520 }}>
          You score on every single match — call the result, and nail the exact scoreline for a bonus on top. Then stake your big tournament bets. Here&rsquo;s the full breakdown.</p>
        <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr 1fr" : "1fr", gap: 10, marginTop: 18 }}>
          {ways.map((w, i) => (<div key={w.title} className="anim-up" style={{ animationDelay: `${0.06 * i + 0.1}s`,
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14,
            background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: w.soft, color: w.on }}>
              <Icon name={w.icon} size={21} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>{w.title}</div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>{w.desc}</div>
            </div>
          </div>))}
        </div>
      </div>
    </div>

    {/* round points table */}
    <SectionHeader title="Match points by round" sub="Correct result earns the base. An exact scoreline adds an 80% bonus." />
    <div className="card" style={{ overflow: "hidden", marginBottom: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 10,
        padding: "10px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
        <span className="t-label" style={{ color: "var(--text-3)" }}>Round</span>
        <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 58 }}>Result</span>
        <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 58 }}>Exact</span>
        <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 56 }}>Max</span>
      </div>
      {rounds.map((r, i) => {
        const exact = Math.round(r.base * 0.8);
        const total = r.base + exact;
        const knockout = r.k !== "Group";
        return (<div key={r.k} className="anim-right" style={{ animationDelay: `${i * 0.05}s`,
          display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 10,
          padding: "12px 18px", borderBottom: i < rounds.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "grid", placeItems: "center",
              background: knockout ? "var(--blue-soft)" : "var(--brand-soft)", color: knockout ? "var(--blue-strong)" : "var(--brand-strong)",
              fontWeight: 800, fontSize: 11 }}>{r.k === "Group" ? "GR" : r.k}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.label}</div>
              <div style={{ height: 5, marginTop: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden", width: desktop ? 220 : 110 }}>
                <div style={{ height: "100%", width: `${(total / maxTotal) * 100}%`, transformOrigin: "left",
                  background: knockout ? "var(--blue)" : "var(--brand)", borderRadius: 99,
                  animation: "bargrow .7s cubic-bezier(.2,.8,.3,1) both", animationDelay: `${i * 0.05 + 0.15}s` }} /></div>
            </div>
          </div>
          <span className="tnum" style={{ textAlign: "right", width: 58, fontWeight: 700, fontSize: 14 }}>{r.base}</span>
          <span className="tnum" style={{ textAlign: "right", width: 58, color: "var(--gold-strong)", fontWeight: 700, fontSize: 14 }}>+{exact}</span>
          <span className="tnum" style={{ textAlign: "right", width: 56, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>{total}</span>
        </div>);
      })}
    </div>

    {/* lock rule callout */}
    <div className="card" style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "15px 17px", marginBottom: 24,
      background: "var(--brand-soft)", border: "1px solid var(--brand-ring)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
        background: "var(--brand)", color: "var(--on-brand)" }}>
        <Icon name="lock" size={18} /></div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--brand-strong)" }}>Picks lock at kickoff</div>
        <div className="t-sm" style={{ color: "var(--text-2)", marginTop: 2 }}>
          You can edit a prediction as many times as you like — right up until the whistle. Once the match starts, it&rsquo;s locked for good.</div>
      </div>
    </div>

    {/* group + tournament bonuses */}
    <SectionHeader title="Group & tournament bonuses" sub="One-off bets that pay big if you read the tournament right." />
    <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
      {sidebets.map((s, i) => (<div key={s.t} className="anim-right" style={{ animationDelay: `${i * 0.04}s`,
        display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderBottom: i < sidebets.length - 1 ? "1px solid var(--line)" : "none" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
          background: s.pts >= 40 ? "var(--gold-soft)" : "var(--surface-2)", color: s.pts >= 40 ? "var(--gold-strong)" : "var(--text-2)" }}>
          <Icon name={s.icon} size={19} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.t}</div>
          <div className="t-xs" style={{ color: "var(--text-3)" }}>{s.d}</div></div>
        <PointsBadge pts={s.pts} size="md" />
      </div>))}
    </div>

    {/* worked example */}
    <WorkedExample />
  </div>);
}

/* an animated worked example so the math is concrete */
function WorkedExample() {
  const lines = [
    { l: "Correct result — France win", v: 10, c: "var(--brand-strong)" },
    { l: "Exact score 2–1 bonus", v: 8, c: "var(--gold-strong)" },
  ];
  return (<div className="card" style={{ overflow: "hidden" }}>
    <div className="trirule" />
    <div style={{ padding: "20px 20px 22px" }}>
      <div className="t-label" style={{ color: "var(--text-3)", marginBottom: 12 }}>Worked example · group match</div>
      {/* the pick */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "14px", borderRadius: 16, background: "var(--surface-2)", marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}><Flag code="FRA" size="lg" /><div className="t-xs" style={{ marginTop: 6, fontWeight: 700 }}>France</div></div>
        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30 }}>2–1</div>
        <div style={{ textAlign: "center" }}><Flag code="DEN" size="lg" /><div className="t-xs" style={{ marginTop: 6, fontWeight: 700 }}>Denmark</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {lines.map((ln, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px" }}>
          <span style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600 }}>{ln.l}</span>
          <span className="tnum" style={{ fontWeight: 800, fontSize: 14.5, color: ln.c || "var(--text)" }}>+{ln.v}</span>
        </div>))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "14px 16px",
        borderRadius: 14, background: "var(--brand)", color: "var(--on-brand)" }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Total earned</span>
        <span className="tnum anim-pop" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>18 pts</span>
      </div>
    </div>
  </div>);
}

Object.assign(window, { HowScoring, WorkedExample });
