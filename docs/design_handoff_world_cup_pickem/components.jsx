/* ===========================================================
   World Cup Pick'em — reusable components & helpers
   Exposes everything on window for sibling babel scripts.
   =========================================================== */
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

/* ---------------- helpers ---------------- */
const cx = (...a) => a.filter(Boolean).join(" ");
const WC = window.WC;
const team = WC.team;

// demo clock: anchored at WC.NOW, advances in real time so countdowns tick
const _mount = Date.now();
function clockNow() { return WC.NOW + (Date.now() - _mount); }

function useClock(intervalMs = 1000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return clockNow();
}

function fmtKick(ms) {
  const d = new Date(ms);
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDay(ms) {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function dayKey(ms) { return new Date(ms).toISOString().slice(0, 10); }

function breakdown( delta) {
  const s = Math.max(0, Math.floor(delta / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, total: s };
}

function matchStatus(m, now) {
  const r = WC.results[m.id];
  if (r) return "done";
  if (now >= m.kickoff) return "live";
  return "open";
}

/* multiplier removed — points are base result + exact-score bonus only */

/* ---------------- icons ---------------- */
const P = {
  home: "M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9",
  trophy: "M7 4h10v3a5 5 0 0 1-10 0V4ZM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 14.5V18m6-3.5V18M8 21h8M10 18h4",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bracket: "M3 5h5v6h5M3 19h5v-6M16 12h5M16 12l-3-1m3 1-3 1",
  medal: "M8 4 6 9m10-5 2 5M9 4h6M12 9v.5m0 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 4 1.2 1.2L12 17l-1.2-1.8L12 13Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6",
  clock: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2",
  lock: "M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1ZM8 11V8a4 4 0 0 1 8 0v3",
  unlock: "M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1ZM8 11V8a4 4 0 0 1 7.5-2",
  check: "M5 12.5 10 17l9-10",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  chevR: "M9 6l6 6-6 6",
  chevL: "M15 6l-6 6 6 6",
  chevD: "M6 9l6 6 6-6",
  bolt: "M13 3 4 14h7l-1 7 9-11h-7l1-7Z",
  sun: "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M4 4l1.5 1.5M18.5 18.5 20 20M2 12h2M20 12h2M4 20l1.5-1.5M18.5 5.5 20 4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  google: "G",
  flame: "M12 3c2 3 .5 5 0 6 2-1 4 .5 4 4a6 6 0 1 1-11.5-2.5C6 13 8 12 8 9c2 1 2 3 1 4 1.5-1 3-4 3-10Z",
  spark: "M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z",
  cal: "M4 6h16v15H4zM4 9h16M8 3v4M16 3v4",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4",
  logout: "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 12h9M16 9l3 3-3 3",
};
function Icon({ name, size = 20, sw = 2, className, style }) {
  if (name === "google") {
    return (<svg width={size} height={size} viewBox="0 0 48 48" className={className} style={style}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.5l6.3 5.3C41.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>);
  }
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d={P[name] || ""} /></svg>);
}

/* ---------------- flag + team chip ---------------- */
function Flag({ code, size }) {
  const t = team(code);
  return <span className={cx("flag", size)} title={t.name}>{t.flag}</span>;
}
function TeamChip({ code, size, bold, sub }) {
  const t = team(code);
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    <Flag code={code} size={size} />
    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span style={{ fontWeight: bold ? 800 : 700, fontSize: size === "lg" ? 17 : 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
      {sub && <span className="t-xs" style={{ color: "var(--text-3)" }}>{sub}</span>}
    </span>
  </span>);
}

/* ---------------- countdown ---------------- */
function Countdown({ to, now, variant = "inline", lockLabel = "Locks in" }) {
  const b = breakdown(to - now);
  const locked = to - now <= 0;
  if (variant === "big") {
    const cell = (v, l) => (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 58 }}>
      <span className="t-display tnum" style={{ fontSize: 42 }}>{String(v).padStart(2, "0")}</span>
      <span className="t-label" style={{ color: "var(--text-3)", marginTop: 4 }}>{l}</span>
    </div>);
    const sep = <span className="t-display" style={{ fontSize: 34, color: "var(--line-strong)", marginTop: -6 }}>:</span>;
    return (<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {b.d > 0 && <>{cell(b.d, "days")}{sep}</>}
      {cell(b.h, "hrs")}{sep}{cell(b.m, "min")}{sep}{cell(b.s, "sec")}
    </div>);
  }
  // inline
  const color = locked ? "var(--text-3)" : b.total < 3600 ? "var(--bad)" : "var(--text-2)";
  let txt;
  if (locked) txt = "Locked";
  else if (b.d > 0) txt = `${b.d}d ${b.h}h`;
  else if (b.h > 0) txt = `${b.h}h ${b.m}m`;
  else txt = `${b.m}m ${String(b.s).padStart(2, "0")}s`;
  return (<span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: 5, color, fontWeight: 700, fontSize: 13 }}>
    <Icon name={locked ? "lock" : "clock"} size={14} sw={2.2} />
    {variant === "labeled" && !locked && <span style={{ color: "var(--text-3)", fontWeight: 600 }}>{lockLabel}</span>}
    {txt}
  </span>);
}

/* ---------------- score stepper ---------------- */
function ScoreStepper({ value, onChange, accent, disabled }) {
  const btn = (dir, icon) => (
    <button disabled={disabled} onClick={() => onChange(Math.max(0, Math.min(20, value + dir)))}
      style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)",
        color: disabled ? "var(--text-3)" : "var(--text)", display: "grid", placeItems: "center", flex: "none" }}>
      <Icon name={icon} size={18} sw={2.4} /></button>);
  return (<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    {btn(-1, "minus")}
    <div className="tnum" style={{ width: 50, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800,
      fontSize: 32, color: accent || "var(--text)" }}>{value}</div>
    {btn(1, "plus")}
  </div>);
}

/* ---------------- outcome toggle ---------------- */
function OutcomeToggle({ value, onChange, home, away, disabled }) {
  const opts = [{ k: "H", l: home }, { k: "D", l: "Draw" }, { k: "A", l: away }];
  return (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "var(--surface-2)",
    padding: 4, borderRadius: 14, border: "1px solid var(--line)" }}>
    {opts.map(o => {
      const on = value === o.k;
      return (<button key={o.k} disabled={disabled} onClick={() => onChange(o.k)}
        style={{ border: "none", borderRadius: 10, padding: "10px 6px", fontWeight: 800, fontSize: 14,
          background: on ? "var(--brand)" : "transparent", color: on ? "var(--on-brand)" : "var(--text-2)",
          boxShadow: on ? "var(--shadow-sm)" : "none", transition: "all .15s", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis", opacity: disabled ? 0.6 : 1 }}>{o.l}</button>);
    })}
  </div>);
}

/* ---------------- points badge ---------------- */
function PointsBadge({ pts, size = "md", state }) {
  const big = size === "lg";
  const bg = state === "miss" ? "var(--surface-2)" : "var(--gold-soft)";
  const fg = state === "miss" ? "var(--text-3)" : "var(--on-gold)";
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color: fg,
    borderRadius: 999, padding: big ? "7px 14px" : "4px 10px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
    <Icon name="bolt" size={big ? 16 : 13} sw={2.4} style={{ color: state === "miss" ? "var(--text-3)" : "var(--gold-strong)" }} />
    <span style={{ fontSize: big ? 18 : 13.5 }}>{pts > 0 ? "+" : ""}{pts}</span>
  </span>);
}

/* ---------------- status pill ---------------- */
function StatusPill({ status, predicted }) {
  if (status === "live") return <span className="pill pill-live"><span className="dot-live" />LIVE</span>;
  if (status === "done") return <span className="pill pill-done"><Icon name="check" size={12} sw={3} />Final</span>;
  if (status === "open") return predicted
    ? <span className="pill pill-done"><Icon name="check" size={12} sw={3} />Predicted</span>
    : <span className="pill pill-open"><Icon name="unlock" size={12} sw={2.4} />Open</span>;
  return <span className="pill pill-locked"><Icon name="lock" size={12} sw={2.4} />Locked</span>;
}

/* ---------------- avatar ---------------- */
function Avatar({ name, hue = 200, size = 40, ring }) {
  return (<div style={{ width: size, height: size, borderRadius: "50%", flex: "none",
    background: `oklch(0.7 0.12 ${hue})`, color: "#fff", display: "grid", placeItems: "center",
    fontWeight: 800, fontSize: size * 0.38, fontFamily: "var(--font-display)",
    boxShadow: ring ? `0 0 0 3px var(--surface), 0 0 0 5px ${ring}` : "none" }}>{name}</div>);
}

/* ---------------- empty state ---------------- */
function EmptyState({ icon = "target", title, body, action }) {
  return (<div style={{ textAlign: "center", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--surface-2)", border: "1px solid var(--line)",
      display: "grid", placeItems: "center", color: "var(--text-3)", marginBottom: 6 }}>
      <Icon name={icon} size={28} /></div>
    <div className="t-h3">{title}</div>
    <div className="t-sm" style={{ color: "var(--text-3)", maxWidth: 280 }}>{body}</div>
    {action && <div style={{ marginTop: 10 }}>{action}</div>}
  </div>);
}

/* ---------------- toast ---------------- */
const ToastCtx = createContext(null);
function useToast() { return useContext(ToastCtx); }
function ToastHost({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems(x => [...x, { id, msg, ...opts }]);
    setTimeout(() => setItems(x => x.filter(i => i.id !== id)), opts.duration || 2600);
  }, []);
  return (<ToastCtx.Provider value={push}>
    {children}
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 22, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 8, zIndex: 9000, pointerEvents: "none" }}>
      {items.map(t => (<div key={t.id} style={{ animation: "toastin .3s cubic-bezier(.2,.8,.3,1) both",
        display: "flex", alignItems: "center", gap: 10, background: "var(--text)", color: "var(--bg)",
        padding: "12px 18px", borderRadius: 999, boxShadow: "var(--shadow-lg)", fontWeight: 700, fontSize: 14,
        maxWidth: "90vw" }}>
        <span style={{ display: "grid", placeItems: "center", color: t.kind === "gold" ? "var(--gold)" : "var(--brand)" }}>
          <Icon name={t.icon || "check"} size={18} sw={2.6} /></span>
        {t.msg}</div>))}
    </div>
  </ToastCtx.Provider>);
}

/* ---------------- app context ---------------- */
const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

Object.assign(window, {
  cx, WC, team, clockNow, useClock, fmtKick, fmtDay, dayKey, breakdown, matchStatus,
  Icon, Flag, TeamChip, Countdown, ScoreStepper, OutcomeToggle, PointsBadge, StatusPill,
  Avatar, EmptyState, ToastHost, useToast, AppCtx, useApp,
});
