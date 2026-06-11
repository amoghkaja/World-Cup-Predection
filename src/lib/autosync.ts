import { after } from "next/server";
import { getSiteUrl } from "@/lib/env";

// Per warm server instance — good enough as a throttle; the sync endpoint is
// idempotent and football-data allows 10 req/min.
let lastAttempt = 0;
const THROTTLE_MS = 3 * 60_000;
// Only chase results while a match is plausibly in play / just ended.
const WINDOW_MS = 5 * 3600_000;

/**
 * Self-healing results: when a page render sees a match that kicked off but
 * still has no final result, kick the results sync after the response is sent.
 * GitHub's scheduled cron regularly slips by hours, which left finished
 * matches stuck on "LIVE" with no points — this lands them within minutes of
 * the data provider updating, as long as anyone is using the app.
 */
export function maybeKickResultsSync(
  matches: { kickoff_at: string; status: string }[]
): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const now = Date.now();
  if (now - lastAttempt < THROTTLE_MS) return;

  const wanting = matches.some((m) => {
    if (m.status === "final") return false;
    const ko = new Date(m.kickoff_at).getTime();
    return now >= ko && now - ko < WINDOW_MS;
  });
  if (!wanting) return;

  lastAttempt = now;
  after(async () => {
    try {
      await fetch(`${getSiteUrl()}/api/cron/sync-results`, {
        headers: { authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
    } catch {
      // best effort — the scheduled job and admin panel remain the backstops
    }
  });
}
