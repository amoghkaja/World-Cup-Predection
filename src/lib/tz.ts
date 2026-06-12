import { cookies } from "next/headers";

export const TZ_COOKIE = "wc_tz";

/**
 * The viewer's IANA timezone, reported by the browser via the wc_tz cookie
 * (see components/TimezoneCookie). Validated before use; null on first-ever
 * visit or garbage values — callers fall back to UTC.
 */
export async function getViewerTimeZone(): Promise<string | null> {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  if (!raw) return null;
  const tz = decodeURIComponent(raw).slice(0, 64);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}
