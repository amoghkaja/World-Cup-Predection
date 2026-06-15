// Shared, import-safe constants for the leaderboard "view" toggle. No server-only
// imports here, so both the client toggle and the server pages can use it.

export const BOARD_COOKIE = "wc_board";

export type BoardView = "real" | "norisk";

/** Parse the cookie value into a board view; anything but "norisk" is the real board. */
export function parseBoardView(value: string | undefined): BoardView {
  return value === "norisk" ? "norisk" : "real";
}
