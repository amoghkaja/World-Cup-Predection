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

/**
 * Like decidedNote but NAMES who went through, so a level 90' knockout can't be
 * misread. The 90' score is level (e.g. AUS 1–1 EGY) and the pens score is shown
 * winner-first, so without the name "4–2 on pens" looks like the first-listed
 * team won. Given the winner's code it returns e.g. "EGY won 4–2 on pens" /
 * "ARG won a.e.t.". Falls back to decidedNote when the winner code is unknown.
 */
export function decidedNoteNamed(
  m: {
    decided_in?: string | null;
    pens_home?: number | null;
    pens_away?: number | null;
    winner_team_id?: number | null;
    home_team_id?: number | null;
    away_team_id?: number | null;
  },
  homeCode: string | null | undefined,
  awayCode: string | null | undefined
): string | null {
  const base = decidedNote(m);
  if (!base) return null;
  const winCode =
    m.winner_team_id != null && m.winner_team_id === m.home_team_id
      ? homeCode
      : m.winner_team_id != null && m.winner_team_id === m.away_team_id
        ? awayCode
        : null;
  if (!winCode) return base; // no team context — plain note
  // "a.e.t." reads as an adjective ("EGY won a.e.t."); the pens/… score reads as
  // the result ("EGY won 4–2 on pens").
  return `${winCode} won ${base}`;
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
