/** Display helpers (deterministic, locale-stable to avoid hydration mismatches). */

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function isLocked(kickoffIso: string, now: number = Date.now()): boolean {
  return now >= new Date(kickoffIso).getTime();
}

export interface Countdown {
  locked: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownTo(kickoffIso: string, now: number = Date.now()): Countdown {
  let diff = Math.floor((new Date(kickoffIso).getTime() - now) / 1000);
  if (diff <= 0) return { locked: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  return { locked: false, days, hours, minutes, seconds };
}

export function countdownLabel(c: Countdown): string {
  if (c.locked) return "Locked";
  if (c.days > 0) return `${c.days}d ${c.hours}h ${c.minutes}m`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m ${c.seconds}s`;
  return `${c.minutes}m ${c.seconds}s`;
}
