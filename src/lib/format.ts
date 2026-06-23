/** Time helpers shared by server pages and client components. */

/** Current epoch ms. Wrapped so server components can read the clock at request time. */
export function serverNow(): number {
  return Date.now();
}

export function isLocked(kickoffIso: string, now: number = Date.now()): boolean {
  return now >= new Date(kickoffIso).getTime();
}

/** True once `ms` milliseconds have passed since `iso`. */
export function elapsedSince(iso: string, ms: number, now: number = Date.now()): boolean {
  return now >= new Date(iso).getTime() + ms;
}

/**
 * Short note for how a knockout tie was settled — "a.e.t." or "4–2 on pens" —
 * or null for a 90-minute result / group game. The stored home_score/away_score
 * are always the 90' score; this annotates everything beyond it.
 */
export function decidedNote(m: {
  decided_in?: string | null;
  pens_home?: number | null;
  pens_away?: number | null;
}): string | null {
  if (!m.decided_in || m.decided_in === "regular") return null;
  if (m.decided_in === "penalties") {
    if (m.pens_home != null && m.pens_away != null) {
      const hi = Math.max(m.pens_home, m.pens_away);
      const lo = Math.min(m.pens_home, m.pens_away);
      return `${hi}–${lo} on pens`;
    }
    return "on pens";
  }
  return "a.e.t.";
}

/* ------------------------------------------------------------------ */
/* Day grouping in the VIEWER's timezone.                              */
/* The tz string travels server → client as a prop (sourced from the   */
/* wc_tz cookie), so SSR and hydration group identically — late local  */
/* kickoffs (e.g. 8pm ET = midnight UTC) stay on the day people        */
/* actually watch them. Falls back to UTC when no/invalid tz.          */
/* ------------------------------------------------------------------ */

/** Sortable day key, e.g. "2026-06-12", in the given IANA timezone. */
export function zonedDayKey(iso: string, tz: string | null): string {
  try {
    // en-CA renders as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10); // invalid tz cookie → UTC day
  }
}

/** Day heading, e.g. "Fri, Jun 12", in the given IANA timezone. */
export function zonedDayLabel(iso: string, tz: string | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  try {
    return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: tz ?? "UTC" });
  } catch {
    return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  }
}
