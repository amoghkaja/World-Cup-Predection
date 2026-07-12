/* v2 screens: Login + Dashboard (mobile + desktop layouts) */
const { useState: uState2, useMemo: uMemo2 } = React;

/* ---------------- LOGIN ---------------- */
function GoogleBtn() {
  return (
    <button className="btn btn-ghost" style={{ width: "100%", minHeight: 46, fontSize: 15 }}>
      <svg width="17" height="17" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.32z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      Continue with Google
    </button>
  );
}

const LOGIN_FLAGS = ["USA", "CAN", "MEX", "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "POR", "JPN", "MAR"];

function LoginHeroPanel({ tall }) {
  return (
    <div className="hero-navy" style={{ position: "relative", height: "100%", minHeight: tall ? 480 : 300 }}>
      <div className="photo" style={{ position: "absolute", inset: 0, background: "transparent" }}>
        <image-slot id="login-hero" shape="rect" placeholder="Drop a player / stadium photo"></image-slot>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(15deg, rgb(14 26 43 / 0.92) 18%, rgb(14 26 43 / 0.25) 60%, transparent)", pointerEvents: "none", zIndex: 2 }}></div>
      <div style={{ position: "absolute", left: 26, right: 26, bottom: 26, zIndex: 3, pointerEvents: "none" }}>
        <Trico wide />
        <div className="td" style={{ fontSize: tall ? 58 : 40, marginTop: 14, color: "var(--on-navy)" }}>
          Call the<br />tournament<span style={{ color: "var(--gold)" }}>.</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: "rgb(242 245 249 / 0.75)", maxWidth: 340 }}>
          Predict all 104 matches of World Cup 2026 and outscore your friends.
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Wordmark size={20} />
      <div>
        <div className="t-h1">Sign in to play</div>
        <div className="t-sm mut" style={{ marginTop: 5 }}>Free to join. Predictions lock at each kickoff.</div>
      </div>
      <GoogleBtn />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {LOGIN_FLAGS.map((c) => <Flag key={c} code={c} size="sm" />)}
        <span className="t-xs mut3">+36 more</span>
      </div>
      <div className="t-xs mut3">By continuing you agree to play fair. June 11 — July 19 · USA · Canada · Mexico</div>
    </div>
  );
}

function LoginScreen({ layout }) {
  if (layout === "desktop") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", height: "100%", minHeight: 844 }}>
        <LoginHeroPanel tall />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, background: "var(--surface)" }}>
          <div style={{ width: 360 }}><LoginForm /></div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 844 }}>
      <div style={{ height: 470, flex: "none" }}><LoginHeroPanel /></div>
      <div style={{ padding: "26px 22px 34px", background: "var(--surface)", flex: 1 }}><LoginForm /></div>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function MatchRow({ m, state, set, now }) {
  const st = matchStatus(m, now);
  const res = WC.results[m.id];
  const pred = state.scores[m.id];
  const h = teamOf(m.home), a = teamOf(m.away);
  const setScore = (side, v) => {
    const cur = state.scores[m.id] || { hs: 0, as: 0 };
    set({ scores: { ...state.scores, [m.id]: { ...cur, [side]: v } } });
  };
  const scoreOf = (side) =>
    st === "done" ? res[side === "hs" ? "home" : "away"]
    : m.live ? m.score[side === "hs" ? 0 : 1]
    : null;

  const rows = [
    { t: h, sc: scoreOf("hs"), side: "hs" },
    { t: a, sc: scoreOf("as"), side: "as" },
  ];
  const winSide = res ? (res.home > res.away ? "hs" : res.away > res.home ? "as" : null) : null;

  return (
    <div className={"mrow st-" + st}>
      <div>
        {rows.map((r) => (
          <div key={r.t.code} className={"mteam" + (winSide ? (winSide === r.side ? " win" : " lose") : "")}>
            <TeamMark code={r.t.code} />
            <span className="code">{r.t.code}</span>
            <span className="name">{r.t.name}</span>
            {st === "open"
              ? <Stepper value={pred ? pred[r.side] : null} onChange={(v) => setScore(r.side, v)} />
              : <span className="sc">{r.sc ?? (pred ? pred[r.side] : "–")}</span>}
          </div>
        ))}
      </div>
      <div className="mmeta">
        {st === "live" && <><span className="pill pill-live"><i></i>Live {m.minute}&prime;</span><span className="t-xs mut3">{m.venue.split("·")[0]}</span></>}
        {st === "open" && <>
          <span className="t-num" style={{ fontSize: 14 }}>{fmtKick(m.kickoff)}</span>
          <span className="t-xs mut3">locks in <Countdown to={m.kickoff} style={{ fontSize: 11 }} /></span>
          <span className={"pill " + (pred ? "pill-acc" : "pill-open")}>{pred ? "Picked" : "Open"}</span>
        </>}
        {st === "done" && <>
          <span className="pill pill-lock">FT</span>
          {pred && <span className={"pill " + (predCorrect(m, pred) ? "pill-pts" : "pill-lock")}>{predCorrect(m, pred) ? "+10 pts" : "0 pts"}</span>}
        </>}
        {st === "locked" && <span className="pill pill-lock">Locked</span>}
      </div>
    </div>
  );
}

function predCorrect(m, pred) {
  const r = WC.results[m.id];
  if (!r) return false;
  const ro = r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
  return ro === pred.outcome;
}

function FeaturedMatch({ m, state, set }) {
  const h = teamOf(m.home), a = teamOf(m.away);
  const pred = state.scores[m.id];
  const setScore = (side, v) => {
    const cur = state.scores[m.id] || { hs: 0, as: 0 };
    set({ scores: { ...state.scores, [m.id]: { ...cur, [side]: v } } });
  };
  return (
    <div className="card" style={{ background: "var(--navy)", border: 0, color: "var(--on-navy)" }}>
      <div style={{ padding: "var(--cardpad)", paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="t-label" style={{ color: "rgb(242 245 249 / 0.55)" }}>Next kickoff · {m.group ? "Group " + m.group : m.round}</span>
        <span className="pill" style={{ background: "rgb(255 255 255 / 0.12)", color: "var(--gold)" }}>
          <Countdown to={m.kickoff} style={{ fontSize: 12 }} />
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, padding: "10px var(--cardpad) 4px" }}>
        {[{ t: h, side: "hs" }, null, { t: a, side: "as" }].map((x, i) =>
          x === null
            ? <div key="vs" className="td" style={{ fontSize: 15, color: "rgb(242 245 249 / 0.4)", textAlign: "center" }}>vs</div>
            : (
              <div key={x.t.code} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <TeamMark code={x.t.code} size="xl" />
                <div className="td" style={{ fontSize: 20 }}>{x.t.code}</div>
                <div className="t-xs" style={{ color: "rgb(242 245 249 / 0.6)" }}>{x.t.name}</div>
                <Stepper value={pred ? pred[x.side] : null} onChange={(v) => setScore(x.side, v)} />
              </div>
            )
        )}
      </div>
      <div style={{ padding: "10px var(--cardpad) var(--cardpad)", textAlign: "center" }}>
        <span className="t-xs" style={{ color: "rgb(242 245 249 / 0.55)" }}>{fmtDay(m.kickoff)} · {fmtKick(m.kickoff)} · {m.venue}</span>
      </div>
    </div>
  );
}

function MiniBoard({ compact }) {
  const top = WC.leaderboard.slice(0, compact ? 3 : 5);
  return (
    <div className="card">
      <div className="card-h">
        <span className="t-label" style={{ color: "var(--ink-2)" }}>Standings</span>
        <span className="t-xs mut3">Round 1</span>
      </div>
      <div className="rows">
        {top.map((u, i) => (
          <div key={u.id} className="lb-row" style={{ gridTemplateColumns: "22px 30px 1fr auto" }}>
            <span className="lb-rank" style={{ fontSize: 13 }}>{i + 1}</span>
            <Avatar name={u.avatar} hue={u.hue} size={26} />
            <span className="t-sm" style={{ fontWeight: u.me ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
            <span className="t-num" style={{ fontSize: 14 }}>{u.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardScreen({ layout, state, set }) {
  const now = useNow();
  const matches = state.comp === "wc26" ? state.matches : COMPS[state.comp].fixtures;
  const live = matches.filter((m) => m.live);
  const upcoming = matches.filter((m) => !m.live && !WC.results[m.id] && m.kickoff > now).sort((a, b) => a.kickoff - b.kickoff);
  const finished = matches.filter((m) => WC.results[m.id]);
  const featured = upcoming[0];
  const rest = upcoming.slice(1, layout === "desktop" ? 9 : 6);

  const byDay = {};
  rest.forEach((m) => { const d = fmtDay(m.kickoff); (byDay[d] = byDay[d] || []).push(m); });

  const main = (
    <>
      {live.length > 0 && <>
        <Sect label="Live now" />
        <div className="card rows">{live.map((m) => <MatchRow key={m.id} m={m} state={state} set={set} now={now} />)}</div>
      </>}
      <Sect label="Your next pick" right="picks lock at kickoff" />
      {featured && <FeaturedMatch m={featured} state={state} set={set} />}
      {Object.entries(byDay).map(([day, ms]) => (
        <React.Fragment key={day}>
          <Sect label={day} right={`${ms.length} matches`} />
          <div className="card rows">{ms.map((m) => <MatchRow key={m.id} m={m} state={state} set={set} now={now} />)}</div>
        </React.Fragment>
      ))}
      {finished.length > 0 && <>
        <Sect label="Full time" />
        <div className="card rows">{finished.map((m) => <MatchRow key={m.id} m={m} state={state} set={set} now={now} />)}</div>
      </>}
    </>
  );

  if (layout === "desktop") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, padding: 24, maxWidth: 1180, margin: "0 auto" }}>
        <div>{main}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 34 }}>
          <MiniBoard />
          <div className="card" style={{ padding: "var(--cardpad)" }}>
            <span className="t-label" style={{ color: "var(--ink-2)" }}>Your form</span>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {["W", "W", "L", "W", "D"].map((r, i) => (
                <span key={i} className="gtag" style={{ width: 26, height: 26, borderRadius: 8, background: r === "W" ? "var(--green)" : r === "L" ? "var(--red)" : "var(--line-2)", color: r === "D" ? "var(--ink-2)" : "#fff", fontSize: 11 }}>{r}</span>
              ))}
            </div>
            <div className="t-xs mut3" style={{ marginTop: 10 }}>4-pick streak · best in your league</div>
          </div>
        </div>
      </div>
    );
  }
  return <div style={{ padding: "16px 16px 90px" }}>{main}</div>;
}

Object.assign(window, { LoginScreen, DashboardScreen, MiniBoard });
