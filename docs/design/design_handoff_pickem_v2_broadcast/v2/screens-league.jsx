/* v2 — competition switcher, club standings, UCL knockout state */
const { useState: uState3, useRef: uRef3, useEffect: uEffect3 } = React;

/* ---------------- COMPETITION SWITCHER ---------------- */
function CompSwitch({ state, set, compact }) {
  const [open, setOpen] = uState3(false);
  const ref = uRef3(null);
  const comp = COMPS[state.comp];
  uEffect3(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const pick = (id) => { setOpen(false); if (id !== state.comp) set({ comp: id, screen: "dashboard" }); };
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line-2)",
          background: "var(--surface)", borderRadius: 9, padding: compact ? "5px 9px" : "6px 11px",
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: compact ? 11.5 : 12.5,
          letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink)",
        }}
      >
        {comp.short}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3.5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60, width: 232, boxShadow: "var(--shadow-lg)" }}>
          <div className="rows">
            {Object.values(COMPS).map((c) => (
              <button key={c.id} onClick={() => pick(c.id)}
                style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: c.id === state.comp ? "var(--accent-soft)" : "var(--surface)", padding: "10px 13px" }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13.5, color: c.id === state.comp ? "var(--accent-strong)" : "var(--ink)" }}>{c.name}</span>
                  {c.id === state.comp && <span className="gtag w" style={{ background: "var(--accent)" }}>ON</span>}
                </span>
                <span className="t-xs mut3" style={{ display: "block", marginTop: 2 }}>{c.tag}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "8px 13px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <span className="t-xs mut3">One account, every competition. Points stay per league.</span>
          </div>
        </div>
      )}
    </span>
  );
}

/* ---------------- CLUB STANDINGS (leagues / UCL league phase) -------- */
function StandingsScreen({ layout, state }) {
  const comp = COMPS[state.comp];
  const desktop = layout === "desktop";
  const rows = comp.standings;
  const zones = comp.zones || [];
  const cols = desktop ? "30px 26px 1fr 34px 34px 34px 34px 44px 44px" : "26px 26px 1fr 30px 40px 40px";
  const relFrom = zones.find((z) => z.danger) ? rows.length - 2 : Infinity;
  return (
    <div style={{ padding: desktop ? 24 : "16px 16px 90px", maxWidth: 900, margin: "0 auto" }}>
      <div className="sect" style={{ marginTop: 0 }}>
        <div>
          <div className="t-h1">{comp.standingsTitle}</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>{comp.standingsNote}</div>
        </div>
        <Trico />
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="lb-row" style={{ gridTemplateColumns: cols, padding: "8px var(--cardpad)", background: "var(--surface-2)" }}>
          <span className="t-label">#</span><span></span><span className="t-label">Club</span>
          <span className="t-label" style={{ textAlign: "right" }}>P</span>
          {desktop && <><span className="t-label" style={{ textAlign: "right" }}>W</span><span className="t-label" style={{ textAlign: "right" }}>D</span><span className="t-label" style={{ textAlign: "right" }}>L</span></>}
          <span className="t-label" style={{ textAlign: "right" }}>GD</span>
          <span className="t-label" style={{ textAlign: "right" }}>Pts</span>
        </div>
        <div className="rows">
          {rows.map(([code, p, w, d, l, gd, pts], i) => {
            const t = teamOf(code);
            const zone = zones.find((z) => !z.danger && z.after === i + 1);
            const inRel = i >= relFrom;
            return (
              <React.Fragment key={code}>
                <div className="lb-row" style={{ gridTemplateColumns: cols, background: inRel ? "var(--red-soft)" : undefined }}>
                  <span className="lb-rank" style={{ fontSize: 13 }}>{i + 1}</span>
                  <TeamMark code={code} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span className="t-num" style={{ fontSize: 13, textAlign: "right", color: "var(--ink-2)" }}>{p}</span>
                  {desktop && <><span className="t-num" style={{ fontSize: 13, textAlign: "right", color: "var(--ink-2)" }}>{w}</span><span className="t-num" style={{ fontSize: 13, textAlign: "right", color: "var(--ink-2)" }}>{d}</span><span className="t-num" style={{ fontSize: 13, textAlign: "right", color: "var(--ink-2)" }}>{l}</span></>}
                  <span className="t-num" style={{ fontSize: 13, textAlign: "right", color: gd > 0 ? "var(--green)" : gd < 0 ? "var(--red)" : "var(--ink-3)" }}>{gd > 0 ? "+" + gd : gd}</span>
                  <span className="t-num" style={{ fontSize: 15, textAlign: "right" }}>{pts}</span>
                </div>
                {zone && (
                  <div style={{ padding: "4px var(--cardpad)", background: "var(--green-soft)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Trico /><span className="t-xs" style={{ color: "var(--green-strong)", fontWeight: 700 }}>{zone.label}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {zones.find((z) => z.danger) && <div className="t-xs mut3" style={{ marginTop: 8 }}>Shaded rows: relegation zone.</div>}
    </div>
  );
}

/* ---------------- UCL KNOCKOUT (locked until league phase ends) ------ */
function UclBracketScreen({ layout }) {
  const rounds = ["Playoff", "Round of 16", "Quarterfinals", "Semifinals", "Final"];
  return (
    <div style={{ padding: layout === "desktop" ? 24 : "16px 16px 90px", maxWidth: 900, margin: "0 auto" }}>
      <div className="sect" style={{ marginTop: 0 }}>
        <div>
          <div className="t-h1">Knockout bracket</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>Seeded from the league-phase table.</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 14, padding: "36px var(--cardpad)", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {rounds.map((r, i) => (
            <span key={r} className="pill pill-lock" style={{ opacity: 1 - i * 0.13 }}>{r}</span>
          ))}
        </div>
        <div className="t-h2">Picks open after matchday 8</div>
        <div className="t-sm mut" style={{ marginTop: 6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Top 8 clubs go straight to the Round of 16; places 9–24 enter the playoff.
          Your bracket unlocks in January — same picking flow as the World Cup.
        </div>
        <div style={{ marginTop: 16 }}>
          <span className="pill pill-pts">Knockout picks score 15 – 70 pts</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompSwitch, StandingsScreen, UclBracketScreen });
