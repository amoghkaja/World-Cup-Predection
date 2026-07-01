// The ONE authoritative board ordering. Points, then correct results, then name;
// ties share a rank (1, 1, 3 …). Used by the live leaderboard, the no-gambles
// view and the daily rank snapshot — if the ordering rule ever changes, it
// changes here for all three or the movement arrows drift against the board.

export type Rankable = {
  total_points: number;
  correct_matches: number;
  display_name: string | null;
};

export function boardComparator(a: Rankable, b: Rankable): number {
  return (
    b.total_points - a.total_points ||
    b.correct_matches - a.correct_matches ||
    (a.display_name ?? "").localeCompare(b.display_name ?? "")
  );
}

/** Sort a copy of `rows` by the board order and attach ties-share ranks. */
export function rankBoard<T extends Rankable>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort(boardComparator);
  let prevPts = NaN;
  let prevRank = 0;
  return sorted.map((r, i) => {
    const rank = r.total_points === prevPts ? prevRank : i + 1;
    prevPts = r.total_points;
    prevRank = rank;
    return { ...r, rank };
  });
}
