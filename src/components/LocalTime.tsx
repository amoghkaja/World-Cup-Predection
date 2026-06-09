"use client";

import { useEffect, useState } from "react";

const FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

/**
 * Renders a UTC timestamp in the visitor's own timezone. Server (and the first
 * client render) show a deterministic UTC version so hydration matches; once
 * mounted we switch to the browser's local zone.
 */
export function LocalTime({ iso }: { iso: string }) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(new Date(iso).toLocaleString(undefined, FMT));
  }, [iso]);

  const fallback = new Date(iso).toLocaleString("en-US", { ...FMT, timeZone: "UTC" });

  return <span suppressHydrationWarning>{local ?? fallback}</span>;
}
