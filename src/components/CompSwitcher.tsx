"use client";

import { useEffect, useRef, useState } from "react";

// Competition switcher (broadcast app bar). Only World Cup 2026 is live —
// the other competitions are teasers until their seasons are wired up.
const COMPS = [
  { id: "wc26", short: "WC 26", name: "World Cup 2026", tag: "104 matches · USA · Canada · Mexico", live: true },
  { id: "epl", short: "League", name: "Premier League", tag: "38 rounds · standings & relegation", live: false },
  { id: "ucl", short: "UCL", name: "Champions League", tag: "League phase + knockout bracket", live: false },
];

export function CompSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="press inline-flex items-center"
        style={{
          gap: 6,
          border: "1px solid var(--line-strong)",
          background: "var(--surface)",
          borderRadius: 9,
          padding: compact ? "5px 9px" : "6px 11px",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: compact ? 11.5 : 12.5,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        WC 26
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
        >
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="card anim-pop"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 60,
            width: 240,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            transformOrigin: "top left",
          }}
        >
          {COMPS.map((c, i) => (
            <div
              key={c.id}
              role="menuitem"
              aria-disabled={!c.live}
              style={{
                padding: "10px 13px",
                background: c.live ? "var(--brand-soft)" : "var(--surface)",
                borderTop: i ? "1px solid var(--line)" : "none",
                opacity: c.live ? 1 : 0.85,
              }}
            >
              <span className="flex items-center justify-between" style={{ gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 13.5,
                    color: c.live ? "var(--brand-strong)" : "var(--text-2)",
                  }}
                >
                  {c.name}
                </span>
                {c.live ? (
                  <span
                    className="gtag w"
                    style={{ background: "var(--brand)", color: "var(--on-brand)", borderRadius: 99 }}
                  >
                    ON
                  </span>
                ) : (
                  <span className="pill pill-locked" style={{ flex: "none" }}>
                    Soon
                  </span>
                )}
              </span>
              <span className="t-xs" style={{ display: "block", marginTop: 2, color: "var(--text-3)" }}>
                {c.tag}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "8px 13px",
              borderTop: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}
          >
            <span className="t-xs" style={{ color: "var(--text-3)" }}>
              More competitions coming soon — one account, points stay per league.
            </span>
          </div>
        </div>
      )}
    </span>
  );
}
