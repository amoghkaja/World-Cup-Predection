"use client";

import { useEffect } from "react";

const COOKIE = "wc_tz";

/**
 * Reports the browser's IANA timezone to the server via a cookie so server
 * renders can group matchdays by the viewer's local calendar (and stay
 * byte-identical with hydration). Renders nothing.
 */
export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const value = encodeURIComponent(tz);
      if (!document.cookie.split("; ").includes(`${COOKIE}=${value}`)) {
        document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      // no Intl timezone support — server falls back to UTC grouping
    }
  }, []);
  return null;
}
