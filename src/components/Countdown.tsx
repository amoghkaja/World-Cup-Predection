"use client";

import { useEffect, useState } from "react";
import { countdownTo, countdownLabel } from "@/lib/format";

export function Countdown({ kickoff, className }: { kickoff: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Render nothing time-sensitive until mounted (avoids hydration mismatch).
  if (now === null) return <span className={className}>—</span>;

  const c = countdownTo(kickoff, now);
  if (c.locked) {
    return (
      <span className={`chip ${className ?? ""}`} style={{ color: "var(--danger)" }}>
        🔒 Locked
      </span>
    );
  }
  const urgent = c.days === 0 && c.hours < 1;
  return (
    <span
      className={`chip ${className ?? ""}`}
      style={{ color: urgent ? "var(--accent)" : "var(--muted)" }}
    >
      ⏳ {countdownLabel(c)}
    </span>
  );
}
