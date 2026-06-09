/* ===========================================================
   Screens — Tournament Picks, Leaderboard, Profile, Admin
   =========================================================== */

/* ---------------- TOURNAMENT PICKS ---------------- */
function TournamentPicks() {
  const { now } = useApp();
  const toast = useToast();
  const upcoming = WC.matches.map(m => m.kickoff).filter(k => k > now);
  const firstKick = upcoming.length ? Math.min(...upcoming) : Math.min(...WC.matches.map(m => m.kickoff));
  const [picks, setPicks] = useState({ champ: "BRA", finalist: "FRA", boot: "ARG" });
  const [openPicker, setOpenPicker] = useState(null);

  const CONTENDERS = ["ARG", "BRA", "FRA", "ESP", "ENG", "GER", "POR", "NED", "USA", "BEL", "URU", "CRO", "MEX", "MAR", "COL", "ITA"];
  const SCORERS = ["ARG", "FRA", "BRA", "ENG", "POR", "ESP", "NED", "GER"]; // by team for demo

  const set = (slot, code) => { setPicks(p => ({ ...p, [slot]: code })); setOpenPicker(null);
    toast("Tournament pick updated", { icon: "check" }); };

  const slots = [
    { key: "champ", label: "Champion", hint: "Lifts the trophy", pts: "70 pts", icon: "trophy", gold: true, pool: CONTENDERS },
    { key: "finalist", label: "Other finalist", hint: "Loses the final", pts: "40 pts", icon: "medal", pool: CONTENDERS },
    { key: "boot", label: "Golden Boot", hint: "Top scorer's nation", pts: "30 pts", icon: "bolt", pool: SCORERS },
  ];

  return (<div className="screen-pad" style={{ maxWidth: 720, margin: "0 auto" }}>
    {/* big lock countdown hero */}
    <div className="card" style={{ overflow: "hidden", marginBottom: 22, position: "relative", background: "var(--brand)", color: "var(--on-brand)", border: "none" }}>
      <PitchLines />
      <div style={{ position: "relative", padding: "26px 22px", textAlign: "center" }}>
        <div className="t-label" style={{ opacity: .85, marginBottom: 6 }}>Pre-tournament picks</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>Lock your champion</h1>
        <p style={{ opacity: .85, fontSize: 14, margin: "8px auto 18px", maxWidth: 380 }}>
          These are worth the most points in the game — and they lock the moment the first match kicks off.</p>
        <div style={{ display: "inline-flex", padding: "14px 20px", borderRadius: 18, background: "rgba(0,0,0,0.16)" }}>
          <Countdown to={firstKick} now={now} variant="big" />
        </div>
        <div className="t-xs" style={{ opacity: .8, marginTop: 12 }}>Locks at first kickoff · {fmtKick(firstKick)}</div>
      </div>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {slots.map(s => {
        const code = picks[s.key];
        return (<div key={s.key} className="card" style={{ padding: 0, overflow: "hidden" }}>
          <button onClick={() => setOpenPicker(openPicker === s.key ? null : s.key)}
            style={{ width: "100%", border: "none", background: "transparent", display: "flex", alignItems: "center",
              gap: 14, padding: "16px 18px", textAlign: "left" }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, flex: "none", display: "grid", placeItems: "center",
              background: s.gold ? "var(--gold-soft)" : "var(--brand-soft)", color: s.gold ? "var(--gold-strong)" : "var(--brand-strong)" }}>
              <Icon name={s.icon} size={24} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="t-h3">{s.label}</span>
                <span className="pill" style={{ background: "var(--gold-soft)", color: "var(--on-gold)" }}>{s.pts}</span>
              </div>
              <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 2 }}>{s.hint}</div>
            </div>
            {code
              ? <span className="chip" style={{ fontSize: 14, padding: "6px 12px 6px 7px" }}><Flag code={code} size="sm" />{team(code).name}</span>
              : <span className="t-sm" style={{ color: "var(--text-3)" }}>Choose</span>}
            <Icon name="chevD" size={18} style={{ color: "var(--text-3)", transform: openPicker === s.key ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {openPicker === s.key && (<div className="anim-up" style={{ padding: "4px 14px 16px", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 14 }}>
              {s.pool.map(c => {
                const on = code === c;
                return (<button key={c} onClick={() => set(s.key, c)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 12,
                    border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface)", cursor: "pointer", textAlign: "left" }}>
                  <Flag code={c} size="sm" />
                  <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team(c).name}</span>
                  {on && <Icon name="check" size={15} sw={2.8} style={{ color: "var(--brand)" }} />}
                </button>);
              })}
            </div>
          </div>)}
        </div>);
      })}
    </div>
  </div>);
}

/* ---------------- LEADERBOARD ---------------- */
function Leaderboard() {
  const { device } = useApp();
  const [scope, setScope] = useState("league"); // league | global
  const rows = WC.leaderboard;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // podium display order: 2nd, 1st, 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]];

  return (<div className="screen-pad" style={{ maxWidth: 760, margin: "0 auto" }}>
    <SectionHeader title="Leaderboard" sub="Friends league · 10 players"
      right={<div className="seg">
        {[["league", "League"], ["global", "Global"]].map(([k, l]) =>
          <button key={k} className={cx("seg-btn", scope === k && "on")} onClick={() => setScope(k)}>{l}</button>)}
      </div>} />

    {/* podium */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "end", marginBottom: 18 }}>
      {podiumOrder.map((r, i) => {
        const place = r === podium[0] ? 1 : r === podium[1] ? 2 : 3;
        const h = place === 1 ? 132 : place === 2 ? 104 : 88;
        const medal = place === 1 ? "var(--gold)" : place === 2 ? "oklch(0.78 0.01 250)" : "oklch(0.66 0.09 50)";
        return (<div key={r.id} className="anim-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", animationDelay: `${i * 0.08}s` }}>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Avatar name={r.avatar} hue={r.hue} size={place === 1 ? 64 : 52} ring={place === 1 ? "var(--gold)" : undefined} />
            <span style={{ position: "absolute", bottom: -6, right: -6, width: 24, height: 24, borderRadius: "50%",
              background: medal, color: "#3a2c00", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12,
              fontFamily: "var(--font-display)", border: "2px solid var(--surface)" }}>{place}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, textAlign: "center", maxWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.me ? "You" : r.name.split(" ")[0]}</div>
          <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--gold-strong)" }}>{r.pts}</div>
          <div style={{ width: "100%", height: h, marginTop: 8, borderRadius: "14px 14px 0 0",
            background: place === 1 ? "var(--brand)" : "var(--surface-2)", border: "1px solid var(--line)", borderBottom: "none",
            display: "grid", placeItems: "start center", paddingTop: 12 }}>
            <Icon name={place === 1 ? "trophy" : "medal"} size={place === 1 ? 26 : 20}
              style={{ color: place === 1 ? "var(--gold)" : "var(--text-3)" }} />
          </div>
        </div>);
      })}
    </div>

    {/* full list */}
    <div className="card" style={{ overflow: "hidden", padding: "6px" }}>
      {rest.map((r, i) => <LeaderboardRow key={r.id} row={r} rank={i + 4} />)}
    </div>

    <div className="t-xs" style={{ color: "var(--text-3)", textAlign: "center", marginTop: 14 }}>
      Updated live as results come in · Accuracy = correct outcomes ÷ settled picks</div>
  </div>);
}

/* ---------------- PROFILE ---------------- */
function Profile() {
  const { go, theme, toggleTheme } = useApp();
  const me = WC.me;
  const stats = [
    ["Total points", me.pts, "bolt", "gold"], ["League rank", `#${me.rank}`, "medal", ""],
    ["Correct picks", me.correct, "target", ""], ["Accuracy", `${me.acc}%`, "spark", ""],
  ];
  const links = [
    ["My Predictions", "List of every call you've made", "list", () => go("predictions")],
    ["How scoring works", "Points & bonuses explained", "spark", () => go("scoring")],
    ["Tournament picks", "Champion, finalist & golden boot", "trophy", () => go("tournament")],
    ["Knockout bracket", "Your path to the final", "bracket", () => go("bracket")],
    ["Admin · Results entry", "Enter final scores (admin only)", "settings", () => go("admin")],
  ];

  return (<div className="screen-pad" style={{ maxWidth: 640, margin: "0 auto" }}>
    {/* header card */}
    <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
      <div style={{ height: 88, background: "var(--brand)", position: "relative" }}><PitchLines /></div>
      <div style={{ padding: "0 20px 20px", marginTop: -36 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <Avatar name={me.avatar} hue={me.hue} size={76} ring="var(--surface)" />
          <div style={{ paddingBottom: 6 }}>
            <h1 className="t-h1">{me.name}</h1>
            <div className="t-sm" style={{ color: "var(--text-3)" }}>{me.handle} · {me.streak}-pick streak</div>
          </div>
        </div>
      </div>
    </div>

    {/* stat grid */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
      {stats.map(([l, v, ic, k]) => (
        <div key={l} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, flex: "none", display: "grid", placeItems: "center",
            background: k === "gold" ? "var(--gold-soft)" : "var(--brand-soft)", color: k === "gold" ? "var(--gold-strong)" : "var(--brand-strong)" }}>
            <Icon name={ic} size={22} /></div>
          <div>
            <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26 }}>{v}</div>
            <div className="t-xs" style={{ color: "var(--text-3)" }}>{l}</div>
          </div>
        </div>))}
    </div>

    {/* nav links */}
    <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
      {links.map(([t, s, ic, fn], i) => (
        <button key={t} onClick={fn} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "15px 18px", border: "none", borderTop: i ? "1px solid var(--line)" : "none", background: "transparent", textAlign: "left", cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
            background: "var(--surface-2)", color: "var(--text-2)" }}><Icon name={ic} size={19} /></div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div>
            <div className="t-xs" style={{ color: "var(--text-3)" }}>{s}</div></div>
          <Icon name="chevR" size={18} style={{ color: "var(--text-3)" }} />
        </button>))}
    </div>

    {/* settings row */}
    <div className="card" style={{ padding: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
          background: "var(--surface-2)", color: "var(--text-2)" }}><Icon name={theme === "dark" ? "moon" : "sun"} size={19} /></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Appearance</div>
          <div className="t-xs" style={{ color: "var(--text-3)" }}>{theme === "dark" ? "Dark" : "Light"} mode</div></div>
        <button className="btn btn-ghost" style={{ padding: "9px 14px", fontSize: 13.5 }} onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />Switch</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px", borderTop: "1px solid var(--line)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
          background: "var(--surface-2)", color: "var(--bad)" }}><Icon name="logout" size={19} /></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Sign out</div>
          <div className="t-xs" style={{ color: "var(--text-3)" }}>{me.handle}</div></div>
        <button className="btn btn-ghost" style={{ padding: "9px 14px", fontSize: 13.5 }} onClick={() => go("login")}>Sign out</button>
      </div>
    </div>
  </div>);
}

/* ---------------- ADMIN RESULTS ENTRY ---------------- */
function AdminResults() {
  const { go, now } = useApp();
  const toast = useToast();
  const [scores, setScores] = useState(() => {
    const init = {};
    Object.entries(WC.results).forEach(([id, r]) => { init[id] = { hs: r.home, as: r.away }; });
    return init;
  });
  const [savedId, setSavedId] = useState(null);

  // matches that have kicked off can have results entered
  const playable = useMemo(() => WC.matches
    .filter(m => now >= m.kickoff || true)
    .sort((a, b) => a.kickoff - b.kickoff), [now]);

  const setScore = (id, slot, v) => setScores(s => ({ ...s, [id]: { hs: 0, as: 0, ...s[id], [slot]: Math.max(0, v) } }));
  const publish = (m) => {
    setSavedId(m.id);
    toast(`Result published · ${team(m.home).code} ${scores[m.id]?.hs ?? 0}–${scores[m.id]?.as ?? 0} ${team(m.away).code}`, { icon: "check", kind: "gold" });
    setTimeout(() => setSavedId(null), 1600);
  };

  return (<div className="screen-pad" style={{ maxWidth: 720, margin: "0 auto" }}>
    <button className="btn btn-ghost" style={{ padding: "8px 14px", marginBottom: 16 }} onClick={() => go("profile")}>
      <Icon name="chevL" size={16} />Back</button>

    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
      <span className="pill" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}><Icon name="lock" size={12} />ADMIN</span>
      <h1 className="t-h1">Results entry</h1>
    </div>
    <p className="t-sm" style={{ color: "var(--text-3)", marginBottom: 20, maxWidth: 460 }}>
      Enter the final score for each match. Publishing settles all predictions and recomputes the leaderboard.</p>

    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {playable.map(m => {
        const settled = !!WC.results[m.id];
        const sc = scores[m.id] || { hs: 0, as: 0 };
        const justSaved = savedId === m.id;
        return (<div key={m.id} className="card" style={{ padding: "14px 16px",
          borderColor: justSaved ? "var(--brand)" : "var(--line)", transition: "border-color .3s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="t-xs" style={{ color: "var(--text-3)", fontWeight: 700 }}>Group {m.group} · {fmtKick(m.kickoff)}</span>
            {settled ? <span className="pill pill-done"><Icon name="check" size={11} sw={3} />Published</span>
              : <span className="pill pill-locked">Awaiting</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <Flag code={m.home} /><span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team(m.home).name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AdminStepper value={sc.hs} onChange={v => setScore(m.id, "hs", v)} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--line-strong)" }}>:</span>
              <AdminStepper value={sc.as} onChange={v => setScore(m.id, "as", v)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, justifyContent: "flex-end" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" }}>{team(m.away).name}</span><Flag code={m.away} />
            </div>
          </div>
          <button className={cx("btn", settled ? "btn-ghost" : "btn-primary")} style={{ width: "100%", marginTop: 13, padding: "11px" }}
            onClick={() => publish(m)}>
            <Icon name="check" size={16} sw={2.6} />{settled ? "Update result" : "Publish result"}</button>
        </div>);
      })}
    </div>
  </div>);
}

function AdminStepper({ value, onChange }) {
  const btn = (dir, icon) => (<button onClick={() => onChange(value + dir)}
    style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface-2)",
      color: "var(--text)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={icon} size={15} sw={2.6} /></button>);
  return (<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    {btn(-1, "minus")}
    <span className="tnum" style={{ width: 26, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>{value}</span>
    {btn(1, "plus")}
  </div>);
}

Object.assign(window, { TournamentPicks, Leaderboard, Profile, AdminResults, AdminStepper });
