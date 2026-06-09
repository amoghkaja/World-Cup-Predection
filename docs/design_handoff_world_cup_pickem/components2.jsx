/* ===========================================================
   World Cup Pick'em — composite reusable components
   MatchCard (inline predict), CompactPredictionRow, LeaderboardRow
   =========================================================== */

/* full match card with inline predict drawer (dashboard) */
function MatchCard({ m, now, prediction, onSave, onOpen, defaultOpen }) {
  const status = matchStatus(m, now);
  const open = status === "open";
  const result = WC.results[m.id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prediction || { outcome: "H", hs: 1, as: 1 });
  const toast = useToast();

  useEffect(() => { if (prediction) setDraft(prediction); }, [prediction]);

  const deriveOutcome = (hs, as) => (hs > as ? "H" : hs < as ? "A" : "D");

  const save = () => {
    onSave(m.id, { ...draft });
    setEditing(false);
    toast(`Prediction saved · ${team(m.home).code} ${draft.hs}–${draft.as} ${team(m.away).code}`, { icon: "check", kind: "gold" });
  };

  return (<div className="card lift" style={{ overflow: "hidden" }}>
    {/* header strip */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px 0" }}>
      <span className="t-xs" style={{ color: "var(--text-3)", fontWeight: 700, letterSpacing: ".03em" }}>
        Group {m.group} · {fmtKick(m.kickoff)}</span>
      <StatusPill status={status} predicted={!!prediction} />
    </div>

    {/* teams row — stacked, never truncates */}
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 16px 14px" }}>
      {[m.home, m.away].map((code, i) => {
        const goals = result ? (i === 0 ? result.home : result.away) : null;
        const winSide = result && result.home !== result.away ? (result.home > result.away ? 0 : 1) : -1;
        const won = winSide === i;
        const pickedSide = prediction ? (prediction.outcome === "H" ? 0 : prediction.outcome === "A" ? 1 : -1) : -2;
        return (<div key={code} style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Flag code={code} size="lg" />
          <span style={{ flex: 1, fontWeight: 800, fontSize: 16.5, color: result && !won && winSide >= 0 ? "var(--text-3)" : "var(--text)" }}>{team(code).name}</span>
          {prediction && !result && pickedSide === i && <Icon name="check" size={15} sw={2.6} style={{ color: "var(--brand)" }} />}
          {result
            ? <span className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: won ? "var(--text)" : "var(--text-3)", minWidth: 22, textAlign: "center" }}>{goals}</span>
            : <span className="t-label" style={{ color: "var(--text-3)", minWidth: 22, textAlign: "center" }}>{i === 0 ? "" : ""}</span>}
        </div>);
      })}
    </div>

    {/* footer: countdown + your pick + action */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      padding: "11px 16px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {open
          ? <Countdown to={m.kickoff} now={now} variant="labeled" />
          : <span className="t-sm" style={{ color: "var(--text-3)", fontWeight: 700, display: "inline-flex", gap: 5, alignItems: "center" }}>
              <Icon name="lock" size={13} />{status === "live" ? "In progress" : "Full time"}</span>}
        {prediction && !editing && (<span className="t-sm tnum" style={{ color: "var(--text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>
          · Pick {prediction.hs}–{prediction.as}</span>)}
      </div>
      {open && (<button className={cx("btn", prediction ? "btn-ghost" : "btn-primary")} style={{ padding: "8px 15px", fontSize: 13.5 }}
        onClick={() => setEditing(e => !e)}>
        {editing ? "Close" : prediction ? "Edit" : "Predict"}</button>)}
      {!open && prediction && <PointsBadge pts={pointsEarned(m, prediction)} state={pointsEarned(m, prediction) > 0 ? "" : "miss"} />}
    </div>

    {/* inline predict drawer */}
    {open && editing && (<div className="anim-up" style={{ padding: "16px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 14 }}>
      <OutcomeToggle value={draft.outcome} onChange={o => setDraft(d => ({ ...d, outcome: o }))}
        home={team(m.home).name} away={team(m.away).name} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div className="t-xs" style={{ color: "var(--text-3)", marginBottom: 6, fontWeight: 700 }}>{team(m.home).code}</div>
          <ScoreStepper value={draft.hs} onChange={hs => setDraft(d => ({ ...d, hs, outcome: deriveOutcome(hs, d.as) }))} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--line-strong)", marginTop: 18 }}>:</span>
        <div style={{ textAlign: "center" }}>
          <div className="t-xs" style={{ color: "var(--text-3)", marginBottom: 6, fontWeight: 700 }}>{team(m.away).code}</div>
          <ScoreStepper value={draft.as} onChange={as => setDraft(d => ({ ...d, as, outcome: deriveOutcome(d.hs, as) }))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: "none", padding: "11px 14px" }} onClick={() => onOpen(m.id)}>Details</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>
          <Icon name="check" size={17} sw={2.6} />Save prediction</button>
      </div>
      <div className="t-xs" style={{ color: "var(--text-3)", textAlign: "center", display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <Icon name="lock" size={12} />Locks the moment the match kicks off</div>
    </div>)}
  </div>);
}

/* compute points for a finished match given a prediction */
function pointsEarned(m, pred) {
  const r = WC.results[m.id];
  if (!r || !pred) return 0;
  const base = WC.roundPoints[m.round] || 10;
  const realOut = r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
  let pts = 0;
  if (pred.outcome === realOut) pts += base;
  if (pred.hs === r.home && pred.as === r.away) pts += Math.round(base * 0.8); // exact score bonus
  return pts;
}

/* compact row for My Predictions history */
function CompactPredictionRow({ m, now, pred }) {
  const status = matchStatus(m, now);
  const r = WC.results[m.id];
  const pts = pointsEarned(m, pred);
  const realOut = r ? (r.home > r.away ? "H" : r.home < r.away ? "A" : "D") : null;
  const correct = r && pred.outcome === realOut;
  return (<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--line)" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Flag code={m.home} size="sm" /><span style={{ fontWeight: 700, fontSize: 14 }}>{team(m.home).code}</span>
        <span className="tnum" style={{ color: "var(--text-3)", fontWeight: 700, fontSize: 13, margin: "0 2px" }}>{pred.hs}–{pred.as}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{team(m.away).code}</span><Flag code={m.away} size="sm" />
      </div>
      <span className="t-xs" style={{ color: "var(--text-3)" }}>
        Group {m.group}{r ? ` · Final ${r.home}–${r.away}` : status === "open" ? " · Awaiting kickoff" : " · In progress"}</span>
    </div>
    {r
      ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 999,
            background: correct ? "var(--good-soft)" : "var(--bad-soft)", color: correct ? "var(--good)" : "var(--bad)" }}>
            <Icon name={correct ? "check" : "x"} size={13} sw={3} /></span>
          <PointsBadge pts={pts} state={pts > 0 ? "" : "miss"} /></div>
      : <span className="pill pill-locked"><Icon name="clock" size={12} />Pending</span>}
  </div>);
}

/* leaderboard row */
function LeaderboardRow({ row, rank }) {
  const me = row.me;
  return (<div style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px",
    background: me ? "var(--brand-soft)" : "transparent", borderRadius: me ? 14 : 0,
    border: me ? "1px solid var(--brand-ring)" : "1px solid transparent", borderBottom: me ? undefined : "1px solid var(--line)" }}>
    <span className="tnum" style={{ width: 26, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800,
      fontSize: 17, color: rank <= 3 ? "var(--gold-strong)" : "var(--text-3)" }}>{rank}</span>
    <Avatar name={row.avatar} hue={row.hue} size={40} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {me ? "You" : row.name}</div>
      <div className="t-xs tnum" style={{ color: "var(--text-3)" }}>{row.acc}% accuracy · {row.picks} picks</div>
    </div>
    <div className="tnum" style={{ textAlign: "right" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>{row.pts}</div>
      <div className="t-xs" style={{ color: "var(--text-3)", marginTop: -1 }}>pts</div>
    </div>
  </div>);
}

/* section header used across screens */
function SectionHeader({ title, sub, right }) {
  return (<div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
    <div>
      <h2 className="t-h2">{title}</h2>
      {sub && <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
    {right}
  </div>);
}

Object.assign(window, { MatchCard, pointsEarned, CompactPredictionRow, LeaderboardRow, SectionHeader });
