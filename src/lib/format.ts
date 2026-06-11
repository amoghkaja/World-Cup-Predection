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
