/* ===========================================================
   World Cup Pick'em — App shell: routing, nav, device frame,
   theme, and Tweaks panel.
   =========================================================== */
const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

const ACCENTS = { green: 152, blue: 245, terracotta: 32 };
const RADII = { soft: [14, 9, 7], round: [22, 13, 10], sharp: [6, 4, 3] };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "green",
  "dark": false,
  "corners": "round",
  "density": "comfy",
  "displayFont": "Archivo"
}/*EDITMODE-END*/;

/* ---- routing config ---- */
const NAV = [
  { key: "dashboard", label: "Home", icon: "home" },
  { key: "bracket", label: "Bracket", icon: "bracket" },
  { key: "groups", label: "Groups", icon: "grid" },
  { key: "leaderboard", label: "Board", icon: "medal" },
  { key: "profile", label: "Profile", icon: "user" },
];
const DESK_NAV = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "predictions", label: "My Predictions", icon: "list" },
  { key: "bracket", label: "Knockout", icon: "bracket" },
  { key: "groups", label: "Groups", icon: "grid" },
  { key: "tournament", label: "Tournament", icon: "trophy" },
  { key: "leaderboard", label: "Leaderboard", icon: "medal" },
  { key: "scoring", label: "How scoring works", icon: "spark" },
  { key: "profile", label: "Profile", icon: "user" },
];
const SCREENS = {
  login: LoginScreen, dashboard: Dashboard, match: MatchDetail,
  predictions: MyPredictions, bracket: KnockoutBracket, groups: GroupPredictions,
  tournament: TournamentPicks, leaderboard: Leaderboard, profile: Profile, admin: AdminResults,
  scoring: HowScoring,
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [device, setDevice] = uS(() => localStorage.getItem("wc_device") || "mobile");
  const [route, setRoute] = uS({ name: "login", params: {} });
  const [theme, setTheme] = uS(t.dark ? "dark" : "light");
  const [predictions, setPredictions] = uS(() => ({ ...WC.predictions }));
  const scrollRef = uR(null);

  // tweak dark <-> theme sync
  uE(() => { setTheme(t.dark ? "dark" : "light"); }, [t.dark]);

  uE(() => { localStorage.setItem("wc_device", device); }, [device]);

  const go = (name, params = {}) => { setRoute({ name, params }); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const savePrediction = (id, p) => setPredictions(prev => ({ ...prev, [id]: p }));
  const toggleTheme = () => setTweak("dark", theme !== "dark");

  const now = useClock(1000);
  const desktop = device === "desktop";
  const isLogin = route.name === "login";

  const ctx = { go, route, params: route.params, now, predictions, savePrediction, device, theme, toggleTheme };
  const Screen = SCREENS[route.name] || Dashboard;

  // tweak-driven CSS variables
  const [r0, r1, r2] = RADII[t.corners] || RADII.round;
  const styleVars = {
    "--brand-h": ACCENTS[t.accent] || 158,
    "--radius": r0 + "px", "--radius-sm": r1 + "px", "--radius-xs": r2 + "px",
    "--pad": t.density === "cozy" ? 0.7 : 1,
    "--font-display": `"${t.displayFont}", system-ui, sans-serif`,
  };

  // device frame sizing (scale to fit viewport)
  const FRAME = desktop ? { w: 1280, h: 824 } : { w: 390, h: 844 };
  const [scale, setScale] = uS(1);
  uE(() => {
    const fit = () => {
      const availW = window.innerWidth - (desktop ? 56 : 40);
      const availH = window.innerHeight - 88;
      setScale(Math.min(availW / FRAME.w, availH / FRAME.h, 1));
    };
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [desktop]);

  return (<AppCtx.Provider value={ctx}>
    {/* presentation toolbar (outside scaled frame) */}
    <div className="stage-toolbar">
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--brand)", display: "grid", placeItems: "center" }}>
          <Icon name="trophy" size={15} style={{ color: "var(--on-brand)" }} /></div>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>World Cup Pick&rsquo;em</span>
        <span className="tb-sep">·</span>
        <span style={{ fontSize: 12.5, opacity: .6 }}>{route.name === "match" ? "Match detail" : (DESK_NAV.find(n => n.key === route.name)?.label || route.name)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="tb-seg">
          {[["mobile", "phone"], ["desktop", "monitor"]].map(([k, ic]) => (
            <button key={k} className={cx("tb-seg-btn", device === k && "on")} onClick={() => setDevice(k)}>
              <TbIcon name={ic} />{k === "mobile" ? "390" : "1280"}</button>))}
        </div>
        <button className="tb-btn" onClick={toggleTheme} title="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} /></button>
      </div>
    </div>

    {/* scaled device frame */}
    <div className="stage-scaleholder" style={{ width: FRAME.w * scale, height: FRAME.h * scale }}>
      <div className="device-frame" data-theme={theme} style={{
        ...styleVars, width: FRAME.w, height: FRAME.h, transform: `scale(${scale})`, transformOrigin: "top left",
        borderRadius: desktop ? 16 : 30 }}>
        {isLogin
          ? <div ref={scrollRef} className="scroll" style={{ height: "100%", overflow: "auto", background: "var(--bg)" }}><Screen /></div>
          : desktop
            ? <DesktopShell ctx={ctx} scrollRef={scrollRef}><Screen /></DesktopShell>
            : <MobileShell ctx={ctx} scrollRef={scrollRef}><Screen /></MobileShell>}
      </div>
    </div>

    {/* Tweaks */}
    <TweaksPanel>
      <TweakSection label="Brand" />
      <TweakRadio label="Accent" value={t.accent} options={["green", "blue", "terracotta"]} onChange={v => setTweak("accent", v)} />
      <TweakToggle label="Dark mode" value={t.dark} onChange={v => setTweak("dark", v)} />
      <TweakSection label="Shape & density" />
      <TweakRadio label="Corners" value={t.corners} options={["soft", "round", "sharp"]} onChange={v => setTweak("corners", v)} />
      <TweakRadio label="Density" value={t.density} options={["cozy", "comfy"]} onChange={v => setTweak("density", v)} />
      <TweakSection label="Type" />
      <TweakRadio label="Display font" value={t.displayFont} options={["Archivo", "Sora", "Space Grotesk"]} onChange={v => setTweak("displayFont", v)} />
    </TweaksPanel>
  </AppCtx.Provider>);
}

/* ---- mobile shell: top bar + content + bottom tab bar ---- */
function MobileShell({ ctx, scrollRef, children }) {
  const { go, route, now, predictions } = ctx;
  const active = route.name;
  const navActive = NAV.find(n => n.key === active) ? active
    : (active === "predictions" || active === "tournament" || active === "match" || active === "admin") ? "dashboard" : active;
  const toPick = WC.matches.filter(m => matchStatus(m, now) === "open" && !predictions[m.id]).length;

  return (<div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px",
      borderBottom: "1px solid var(--line)", background: "var(--surface)", flex: "none", zIndex: 5 }}>
      <button onClick={() => go("dashboard")} style={{ border: "none", background: "transparent", padding: 0 }}><Logo /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => go("scoring")} aria-label="How scoring works" style={{ width: 40, height: 40, borderRadius: 12,
          border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text-2)", display: "grid", placeItems: "center" }}>
          <Icon name="spark" size={19} />
        </button>
        <button onClick={() => go("predictions")} style={{ position: "relative", width: 40, height: 40, borderRadius: 12,
          border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text-2)", display: "grid", placeItems: "center" }}>
          <Icon name="list" size={19} />
          {toPick > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 99, background: "var(--gold)", color: "var(--on-gold)", fontSize: 11, fontWeight: 800,
            display: "grid", placeItems: "center", border: "2px solid var(--surface)" }}>{toPick}</span>}
        </button>
        <Avatar name={WC.me.avatar} hue={WC.me.hue} size={40} />
      </div>
    </header>

    <div ref={scrollRef} className="scroll" style={{ flex: 1, overflow: "auto", overflowX: "hidden" }}>{children}</div>

    <nav style={{ display: "flex", padding: "8px 6px 10px", borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "none" }}>
      {NAV.map(n => {
        const on = navActive === n.key;
        return (<button key={n.key} onClick={() => go(n.key)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 2px",
            border: "none", background: "transparent", color: on ? "var(--brand)" : "var(--text-3)", cursor: "pointer" }}>
          <Icon name={n.icon} size={22} sw={on ? 2.4 : 2} />
          <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600 }}>{n.label}</span></button>);
      })}
    </nav>
  </div>);
}

/* ---- desktop shell: sidebar + content ---- */
function DesktopShell({ ctx, scrollRef, children }) {
  const { go, route, now, predictions } = ctx;
  const active = route.name === "match" ? "dashboard" : route.name === "admin" ? "profile" : route.name;
  const toPick = WC.matches.filter(m => matchStatus(m, now) === "open" && !predictions[m.id]).length;

  return (<div style={{ height: "100%", display: "grid", gridTemplateColumns: "236px 1fr", background: "var(--bg)" }}>
    <aside style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "20px 16px" }}>
      <div style={{ padding: "4px 8px 22px" }}><Logo /></div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {DESK_NAV.map(n => {
          const on = active === n.key;
          return (<button key={n.key} onClick={() => go(n.key)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12, border: "none",
              background: on ? "var(--brand-soft)" : "transparent", color: on ? "var(--brand-strong)" : "var(--text-2)",
              fontWeight: on ? 800 : 600, fontSize: 14.5, cursor: "pointer", textAlign: "left", transition: "background .15s" }}>
            <Icon name={n.icon} size={20} sw={on ? 2.3 : 2} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.key === "dashboard" && toPick > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99,
              background: "var(--gold)", color: "var(--on-gold)", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}>{toPick}</span>}
          </button>);
        })}
      </nav>
      <button onClick={() => go("profile")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px",
        borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface-2)", cursor: "pointer", marginTop: 12 }}>
        <Avatar name={WC.me.avatar} hue={WC.me.hue} size={38} />
        <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{WC.me.name}</div>
          <div className="t-xs" style={{ color: "var(--text-3)" }}>Rank #{WC.me.rank} · {WC.me.pts} pts</div>
        </div>
      </button>
    </aside>
    <div ref={scrollRef} className="scroll" style={{ overflow: "auto", overflowX: "hidden" }}>{children}</div>
  </div>);
}

/* small toolbar icons */
function TbIcon({ name }) {
  const paths = {
    phone: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM10 19h4",
    monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  };
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} /></svg>);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastHost><App /></ToastHost>
);
