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
