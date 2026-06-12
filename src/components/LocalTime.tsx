"use client";

/**
 * Visitor-local date/time rendering without the "render a dash, then swap after
 * mount" double-render: the server emits UTC text, and React patches the text
 * to the visitor's timezone during hydration (suppressHydrationWarning on the
 * text node only). One render, no layout shift, no effect.
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

function local(iso: string, fmt: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString(undefined, fmt);
}

/** "Thu, Jun 11, 6:00 PM EDT" in the visitor's timezone. */
export function LocalTime({ iso }: { iso: string }) {
  return <span suppressHydrationWarning>{local(iso, FULL)}</span>;
}

/** Kickoff clock only, e.g. "6:00 PM" / "18:00" per locale. */
export function LocalKickoff({ iso, className }: { iso: string; className?: string }) {
  return (
    <span suppressHydrationWarning className={className}>
      {local(iso, TIME)}
    </span>
  );
}
