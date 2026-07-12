"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

// One shared 1s ticker for every countdown on screen — 100 match rows used to
// each run their own interval + re-render every second, which made the whole
// page feel laggy on phones.
type Tick = () => void;
const subs = new Set<Tick>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(fn: Tick): () => void {
  subs.add(fn);
  if (!timer) timer = setInterval(() => subs.forEach((s) => s()), 1000);
  return () => {
    subs.delete(fn);
    if (subs.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// Quantize "now" to the coarsest step the display can show ("2d 3h" only
// changes hourly) — identical state means React skips the re-render.
function quantized(ko: number, perSecond: boolean): number {
  const n = Date.now();
  const diff = ko - n;
  if (diff <= 0) return ko; // locked: stable value, no further re-renders
  const step = perSecond || diff < 3_600_000 ? 1000 : diff < 86_400_000 ? 60_000 : 3_600_000;
  return Math.floor(n / step) * step;
}

// Inline (icon + "2d 3h", red under 1h) and big (dd:hh:mm:ss cells) countdowns.
// Rendered once: the server's clock seeds SSR, the client's clock takes over at
// hydration (suppressHydrationWarning on the numeric text), then the shared
// ticker drives updates.
export function Countdown({
  kickoff,
  variant = "inline",
  lockLabel = "Locks in",
  className,
}: {
  kickoff: string;
  variant?: "inline" | "big" | "labeled" | "bare";
  lockLabel?: string;
  className?: string;
}) {
  const perSecond = variant === "big";
  const ko = new Date(kickoff).getTime();
  const [now, setNow] = useState(() => quantized(ko, perSecond));

  useEffect(() => {
    return subscribe(() => setNow(quantized(new Date(kickoff).getTime(), perSecond)));
  }, [kickoff, perSecond]);

  const diff = ko - now;
  const locked = diff <= 0;
  const s = Math.max(0, Math.floor(diff / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (variant === "big") {
    if (locked) {
      return (
        <span className={className} style={{ color: "var(--text-3)", fontWeight: 700 }}>
          Kickoff has passed
        </span>
      );
    }
    const cell = (v: number, l: string) => (
      <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
        <span className="t-display tnum" suppressHydrationWarning style={{ fontSize: 40 }}>
          {String(v).padStart(2, "0")}
        </span>
        <span className="t-label" style={{ color: "var(--text-3)", marginTop: 4 }}>
          {l}
        </span>
      </div>
    );
    const sep = (
      <span className="t-display" aria-hidden style={{ fontSize: 32, color: "var(--line-strong)", marginTop: -6 }}>
        :
      </span>
    );
    return (
      <div className={`flex items-center ${className ?? ""}`} style={{ gap: 10 }}>
        {d > 0 && (
          <>
            {cell(d, "days")}
            {sep}
          </>
        )}
        {cell(h, "hrs")}
        {sep}
        {cell(m, "min")}
        {sep}
        {cell(sec, "sec")}
      </div>
    );
  }

  let txt: string;
  if (locked) txt = "Locked";
  else if (d > 0) txt = `${d}d ${h}h`;
  else if (h > 0) txt = `${h}h ${m}m`;
  else txt = `${m}m ${String(sec).padStart(2, "0")}s`;

  // bare: just the ticking value, color inherited (navy featured card, pills)
  if (variant === "bare") {
    return (
      <span className={`tnum ${className ?? ""}`} suppressHydrationWarning style={{ fontWeight: 800 }}>
        {txt}
      </span>
    );
  }

  const color = locked ? "var(--text-3)" : s < 3600 ? "var(--bad)" : "var(--text-2)";

  return (
    <span
      className={`tnum inline-flex items-center ${className ?? ""}`}
      style={{ gap: 5, color, fontWeight: 700, fontSize: 13 }}
    >
      <Icon name={locked ? "lock" : "clock"} size={14} sw={2.2} />
      {variant === "labeled" && !locked && (
        <span style={{ color: "var(--text-3)", fontWeight: 600 }}>{lockLabel}</span>
      )}
      <span suppressHydrationWarning>{txt}</span>
    </span>
  );
}
