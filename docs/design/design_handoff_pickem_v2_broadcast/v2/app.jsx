/* v2 shell — side-by-side device frames + tweaks + app state */
const { useState: uState, useEffect: uEffect, useMemo: uMemo, useRef: uRef } = React;

const SCREEN_COMPONENTS = {
  login: () => LoginScreen,
  dashboard: () => DashboardScreen,
  groups: () => GroupsScreen,
  bracket: (comp) => (comp === "ucl" ? UclBracketScreen : BracketScreen),
  standings: () => StandingsScreen,
  leaderboard: () => LeaderboardScreen,
};

/* default group picks: seed favorites */
const DEFAULT_GROUP_PICKS = {};
Object.keys(WC.groups).forEach((g) => {
  DEFAULT_GROUP_PICKS[g] = { w: WC.groups[g][0], r: WC.groups[g][1] };
});

/* one live match injected for broadcast feel */
const LIVE_MATCH = {
  id: "live1", home: "URU", away: "KOR", group: "A", round: "Group",
  kickoff: WC.NOW - 62 * 60000, venue: "Estadio Akron · Guadalajara", live: true, minute: 63, score: [1, 1],
};

function AppBarMobile({ state, set }) {
  return (
    <div className="appbar">
      <Wordmark size={15} />
      <CompSwitch state={state} set={set} compact />
      <span style={{ flex: 1 }}></span>
      <Avatar name="AR" hue={200} size={28} />
    </div>
  );
}

function AppBarDesktop({ state, set }) {
  const screen = state.screen;
  const go = (k) => set({ screen: k });
  return (
    <div className="appbar" style={{ padding: "10px 24px" }}>
      <Wordmark size={16} />
      <CompSwitch state={state} set={set} />
      <span style={{ width: 10 }}></span>
      <nav className="dnav">
        {COMPS[state.comp].nav.map(([k, label]) => (
          <button key={k} className={screen === k ? "on" : ""} onClick={() => go(k)}>{label}</button>
        ))}
      </nav>
      <span style={{ flex: 1 }}></span>
      <span className="pill pill-pts">241 pts</span>
      <Avatar name="AR" hue={200} size={30} />
    </div>
  );
}

function TabBar({ state, set }) {
  const tabs = COMPS[state.comp].nav;
  return (
    <div className="tabbar" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map(([k, label, icon]) => (
        <button key={k} className={state.screen === k ? "on" : ""} onClick={() => set({ screen: k })}>
          <TIcon kind={icon} />{label}
        </button>
      ))}
    </div>
  );
}

function DeviceApp({ layout, state, set }) {
  const screen = state.screen;
  const S = (SCREEN_COMPONENTS[screen] || SCREEN_COMPONENTS.dashboard)(state.comp);
  const chrome = screen !== "login";
  return (
    <div className={"frame " + layout}>
      <div className="frame-scroll">
        {chrome && (layout === "mobile" ? <AppBarMobile state={state} set={set} /> : <AppBarDesktop state={state} set={set} />)}
        <S layout={layout} state={state} set={set} />
      </div>
      {chrome && layout === "mobile" && <TabBar state={state} set={set} />}
    </div>
  );
}

function Frames({ device, state, set }) {
  const ref = uRef(null);
  const [scale, setScale] = uState(1);
  const totalW = device === "both" ? 390 + 56 + 1280 : device === "mobile" ? 390 : 1280;
  uEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / totalW));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalW]);

  const frames = [];
  if (device !== "desktop") frames.push(["mobile", "Mobile · 390"]);
  if (device !== "mobile") frames.push(["desktop", "Desktop · 1280"]);

  return (
    <div ref={ref} className="stage">
      <div className="frames" style={{ transform: `scale(${scale})`, height: (844 + 30) * scale }}>
        {frames.map(([layout, label]) => (
          <div key={layout} className="frame-wrap">
            <div className="fr-label"><Trico />{label}</div>
            <DeviceApp layout={layout} state={state} set={set} />
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [tweaks, setTweak] = useTweaks({
    accent: "blue",
    font: "archivo",
    density: "comfortable",
    radius: 12,
    photo: "duotone",
  });
  const [device, setDevice] = uState("both");
  const [state, setState] = uState({
    comp: "wc26",
    screen: "dashboard",
    scores: { ...WC.predictions },
    groupPicks: DEFAULT_GROUP_PICKS,
    koPicks: {},
    matches: [...WC.matches, LIVE_MATCH],
  });
  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  uEffect(() => {
    const b = document.body;
    b.dataset.accent = tweaks.accent;
    b.dataset.font = tweaks.font === "barlow" ? "barlow" : "archivo";
    b.dataset.density = tweaks.density === "compact" ? "compact" : "comfortable";
    b.dataset.photo = tweaks.photo;
    b.style.setProperty("--radius", tweaks.radius + "px");
  }, [tweaks]);

  return (
    <>
      <div className="shellbar">
        <span className="td" style={{ fontSize: 14 }}>World Cup Pick&rsquo;em <span style={{ color: "var(--accent)" }}>redesign</span></span>
        <span className="seg">
          {[["login", "Login"]].concat(COMPS[state.comp].nav.map(([k, label]) => [k, label])).map(([k, label]) => (
            <button key={k} className={state.screen === k ? "on" : ""} onClick={() => set({ screen: k })}>{label}</button>
          ))}
        </span>
        <span style={{ flex: 1 }}></span>
        <span className="seg">
          {[["both", "Side by side"], ["mobile", "Mobile"], ["desktop", "Desktop"]].map(([k, label]) => (
            <button key={k} className={device === k ? "on" : ""} onClick={() => setDevice(k)}>{label}</button>
          ))}
        </span>
      </div>
      <Frames device={device} state={state} set={set} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Color">
          <TweakRadio label="Accent" value={tweaks.accent} options={[
            { value: "blue", label: "Blue" }, { value: "red", label: "Red" }, { value: "green", label: "Green" },
          ]} onChange={(v) => setTweak("accent", v)} />
        </TweakSection>
        <TweakSection label="Type">
          <TweakRadio label="Display font" value={tweaks.font} options={[
            { value: "archivo", label: "Archivo" }, { value: "barlow", label: "Barlow Cond." },
          ]} onChange={(v) => setTweak("font", v)} />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio label="Density" value={tweaks.density} options={[
            { value: "comfortable", label: "Comfy" }, { value: "compact", label: "Compact" },
          ]} onChange={(v) => setTweak("density", v)} />
          <TweakSlider label="Corner radius" min={4} max={20} step={1} value={tweaks.radius} onChange={(v) => setTweak("radius", v)} />
        </TweakSection>
        <TweakSection label="Imagery">
          <TweakRadio label="Photos" value={tweaks.photo} options={[
            { value: "duotone", label: "Duotone" }, { value: "full", label: "Full color" },
          ]} onChange={(v) => setTweak("photo", v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
