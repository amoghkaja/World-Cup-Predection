"use client";

import { useEffect, useState } from "react";

/**
 * Absolute kickoff times in the visitor's timezone.
 *
 * The server renders with the viewer's IANA zone from the wc_tz cookie, so the
 * HTML is already correct and hydration matches byte-for-byte. After mount we
 * recompute in the browser's own zone/locale — a state bail-out (no re-render)
 * when the cookie was right, a quick correction on a first-ever visit or a
 * stale cookie. (We previously leaned on suppressHydrationWarning here, but
 * React only silences that mismatch — it never patches the text, so full page
 * loads kept showing raw UTC clocks.)
 */

const FULL: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function zoned(iso: string, opts: Intl.DateTimeFormatOptions, tz: string | null | undefined) {
  try {
    return new Date(iso).toLocaleString("en-US", { ...opts, timeZone: tz ?? "UTC" });
  } catch {
    return new Date(iso).toLocaleString("en-US", { ...opts, timeZone: "UTC" });
  }
}

function useZonedText(
  iso: string,
  opts: Intl.DateTimeFormatOptions,
  tz: string | null | undefined
): string {
  const [text, setText] = useState(() => zoned(iso, opts, tz));
  useEffect(() => {
    // Browser zone + browser locale (e.g. 24h clock in Germany). Identical
    // text bails out without a re-render.
    const browser = new Date(iso).toLocaleString(undefined, opts);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only correction
    setText((t) => (t === browser ? t : browser));
  }, [iso, opts]);
  return text;
}

/** "Thu, Jun 11, 6:00 PM EDT" in the visitor's timezone. */
export function LocalTime({ iso, tz }: { iso: string; tz?: string | null }) {
  return <span>{useZonedText(iso, FULL, tz)}</span>;
}

/** Kickoff clock only, e.g. "6:00 PM" / "00:00" per locale. */
export function LocalKickoff({
  iso,
  tz,
  className,
}: {
  iso: string;
  tz?: string | null;
  className?: string;
}) {
  return <span className={className}>{useZonedText(iso, TIME, tz)}</span>;
}
