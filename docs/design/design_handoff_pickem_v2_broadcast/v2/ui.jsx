/* v2 UI primitives — flags, chips, steppers, countdown, avatars */
const { useState, useEffect, useMemo } = React;

// team code -> flagcdn iso code
const ISO = {
  USA: "us", CAN: "ca", MEX: "mx", ARG: "ar", BRA: "br", FRA: "fr",
  ENG: "gb-eng", ESP: "es", GER: "de", POR: "pt", NED: "nl", BEL: "be",
  CRO: "hr", ITA: "it", URU: "uy", COL: "co", JPN: "jp", KOR: "kr",
  SEN: "sn", MAR: "ma", SUI: "ch", DEN: "dk", AUS: "au", ECU: "ec",
  GHA: "gh", POL: "pl", SRB: "rs", CMR: "cm", TUN: "tn", WAL: "gb-wls",
  IRN: "ir", QAT: "qa", KSA: "sa", CRC: "cr", NGA: "ng", EGY: "eg",
  CIV: "ci", PER: "pe", CHI: "cl", PAR: "py", SCO: "gb-sct", NOR: "no",
  SWE: "se", AUT: "at", TUR: "tr", UKR: "ua", NZL: "nz", JAM: "jm",
  PAN: "pa", ALG: "dz", DRC: "cd", UZB: "uz",
};

function Flag({ code, size }) {
  const iso = ISO[code];
  if (!iso) return <span className={"flag " + (size || "")} />;
  return (
    <img
      className={"flag " + (size || "")}
      src={`https://flagcdn.com/w80/${iso}.png`}
      srcSet={`https://flagcdn.com/w160/${iso}.png 2x`}
      alt={code}
      loading="lazy"
    />
  );
}

/* national teams get flags; clubs get monogram badges (generic, no marks) */
function TeamMark({ code, size }) {
  if (ISO[code]) return <Flag code={code} size={size} />;
  const c = (window.CLUBS || {})[code];
  const fs = { sm: 6.5, lg: 11, xl: 14 }[size] || 8;
  return (
    <span className={"flag " + (size || "")} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: c ? c.bg : "var(--surface-2)", color: c ? c.fg : "var(--ink-3)",
      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: fs, letterSpacing: "0.05em",
    }}>{code}</span>
  );
}

function Trico({ wide }) {
  return (
    <span className={"trico" + (wide ? " wide" : "")}><i></i><i></i><i></i></span>
  );
}

function Wordmark({ light, size }) {
  const s = size || 16;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="td" style={{ fontSize: s, color: light ? "var(--on-navy)" : "var(--ink)" }}>
        Pick&rsquo;em <span style={{ color: light ? "var(--gold)" : "var(--accent)" }}>&rsquo;26</span>
      </span>
      <Trico />
    </span>
  );
}

function Avatar({ name, hue, size }) {
  const s = size || 30;
  return (
    <span
      className="ava"
      style={{
        width: s, height: s, fontSize: s * 0.38,
        background: `oklch(0.55 0.11 ${hue})`,
      }}
    >{name}</span>
  );
}

function Stepper({ value, onChange }) {
  return (
    <span className="step">
      <button type="button" onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} aria-label="minus">&minus;</button>
      <span className="v">{value ?? "–"}</span>
      <button type="button" onClick={() => onChange(Math.min(9, (value ?? 0) + 1))} aria-label="plus">+</button>
    </span>
  );
}

/* Countdown anchored to the mock NOW; ticks in real time from there */
const BOOT = Date.now();
function useNow() {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return WC.NOW + (Date.now() - BOOT);
}
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${p(h)}:${p(m)}` : `${p(h)}:${p(m)}:${p(ss)}`;
}
function Countdown({ to, style }) {
  const now = useNow();
  return <span className="t-num" style={style}>{fmtCountdown(to - now)}</span>;
}

function fmtKick(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}
function fmtDay(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/* simple geometric tab icons */
function TIcon({ kind }) {
  const P = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round" };
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" {...P} stroke="currentColor">
      {kind === "matches" && <><circle cx="10" cy="10" r="7" /><path d="M10 3v14 M3 10h14" opacity="0.5" /></>}
      {kind === "groups" && <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></>}
      {kind === "bracket" && <><path d="M4 5h4 M4 15h4 M8 5v10 M8 10h5 M13 10h3" /></>}
      {kind === "table" && <><path d="M4 5h12 M4 10h12 M4 15h8" /></>}
      {kind === "trophy" && <><path d="M6.5 4h7v4.5a3.5 3.5 0 0 1-7 0z" /><path d="M10 12.5v2.5 M7 16.5h6" /></>}
    </svg>
  );
}

/* section header */
function Sect({ label, right }) {
  return (
    <div className="sect">
      <span className="t-label" style={{ color: "var(--ink-2)" }}>{label}</span>
      {right && <span className="t-xs mut3">{right}</span>}
    </div>
  );
}

/* live/lock/open status for a match */
function matchStatus(m, now) {
  if (m.live) return "live";
  if (WC.results[m.id]) return "done";
  return m.kickoff <= now ? "locked" : "open";
}

Object.assign(window, {
  ISO, Flag, TeamMark, Trico, Wordmark, Avatar, Stepper, Countdown,
  useNow, fmtCountdown, fmtKick, fmtDay, TIcon, Sect, matchStatus,
});
