/* v2 screens: Leaderboard */

const LB_MOVES = { u1: "up", u2: "fl", me: "up", u4: "dn", u5: "up", u6: "dn", u7: "fl", u8: "up", u9: "dn", u10: "fl" };

function PodiumCard({ u, place }) {
  const medal = ["var(--gold)", "#b9c2cc", "#c9906b"][place - 1];
  return (
    <div className="card" style={{ flex: 1, padding: "var(--cardpad)", textAlign: "center", position: "relative", overflow: "visible", borderTop: `3px solid ${medal}` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
        <div style={{ position: "relative" }}>
          <Avatar name={u.avatar} hue={u.hue} size={place === 1 ? 52 : 44} />
          <span className="gtag" style={{ position: "absolute", top: -6, right: -10, background: medal, color: place === 1 ? "var(--on-navy)" : "#fff", background: medal, borderRadius: 99, minWidth: 20, height: 20 }}>{place}</span>
        </div>
        <span className="t-sm" style={{ fontWeight: 800, lineHeight: 1.15 }}>{u.name.replace("You (", "").replace(")", "")}</span>
        <span className="t-num" style={{ fontSize: 22 }}>{u.pts}</span>
        <span className="t-xs mut3">{u.acc}% accuracy</span>
      </div>
    </div>
  );
}

function AccBar({ pct }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 86 }}>
      <span style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: pct + "%", background: "var(--accent)", borderRadius: 2 }}></span>
      </span>
      <span className="t-xs mut" style={{ fontVariantNumeric: "tabular-nums", width: 30, textAlign: "right" }}>{pct}%</span>
    </span>
  );
}

function LeaderboardScreen({ layout, state }) {
  const comp = COMPS[state.comp];
  const lb = WC.leaderboard;
  const top3 = lb.slice(0, 3);
  const desktop = layout === "desktop";

  const table = (
    <div className="card">
      <div className="card-h">
        <span className="t-label" style={{ color: "var(--ink-2)" }}>League table · Office League</span>
        <span className="t-xs mut3">10 players · updated after each match</span>
      </div>
      <div className="rows">
        {lb.map((u, i) => {
          const mv = LB_MOVES[u.id] || "fl";
          return (
            <div key={u.id} className={"lb-row" + (u.me ? " me" : "")} style={desktop ? { gridTemplateColumns: "34px 22px 34px 1fr 120px 90px 70px" } : undefined}>
              <span className="lb-rank">{i + 1}</span>
              {desktop && <span className={"lb-move " + mv}>{mv === "up" ? "▲" : mv === "dn" ? "▼" : "—"}</span>}
              <Avatar name={u.avatar} hue={u.hue} size={30} />
              <span style={{ fontWeight: u.me ? 800 : 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.name}{u.me && <span className="t-xs" style={{ color: "var(--accent-strong)", marginLeft: 6 }}>YOU</span>}
              </span>
              {desktop && <AccBar pct={u.acc} />}
              {desktop && <span className="t-xs mut3" style={{ textAlign: "right" }}>{u.picks} picks</span>}
              <span className="t-num" style={{ fontSize: 16, textAlign: "right" }}>{u.pts}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const side = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: "var(--cardpad)" }}>
        <span className="t-label" style={{ color: "var(--ink-2)" }}>Your season</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          {[["Rank", "#3"], ["Points", "241"], ["Accuracy", "66%"], ["Streak", "4 ✓"]].map(([k, v]) => (
            <div key={k}>
              <div className="t-num" style={{ fontSize: 22 }}>{v}</div>
              <div className="t-xs mut3" style={{ marginTop: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ position: "relative", height: 150 }} className="photo">
          <image-slot id="lb-photo" shape="rect" placeholder="Drop a celebration photo"></image-slot>
        </div>
        <div style={{ padding: "var(--cardpad)" }}>
          <div className="t-h2">12 pts behind the lead</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>A correct exact score tomorrow puts you top of the table.</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: desktop ? 24 : "16px 16px 90px", maxWidth: 1180, margin: "0 auto" }}>
      <div className="sect" style={{ marginTop: 0 }}>
        <div>
          <div className="t-h1">Leaderboard</div>
          <div className="t-sm mut" style={{ marginTop: 4 }}>{comp.lbNote} · early-bird bonus active</div>
        </div>
        <Trico />
      </div>
      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        {top3.map((u, i) => <PodiumCard key={u.id} u={u} place={i + 1} />)}
      </div>
      {desktop ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
          {table}
          {side}
        </div>
      ) : table}
    </div>
  );
}

Object.assign(window, { LeaderboardScreen });
