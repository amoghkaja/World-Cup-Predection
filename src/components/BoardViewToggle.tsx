"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BOARD_COOKIE, type BoardView } from "@/lib/board-cookie";

// View-only leaderboard toggle: hide the risk-gamble points (side bets + joker).
// Stored in a cookie so the choice carries to the profile pages too; never
// changes any real score. Server reads the cookie and re-ranks accordingly.
export function BoardViewToggle({ view }: { view: BoardView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const on = view === "norisk";

  function toggle() {
    const next: BoardView = on ? "real" : "norisk";
    // 30-day persistent preference; expire it to go back to the real board.
    document.cookie =
      next === "norisk"
        ? `${BOARD_COOKIE}=norisk; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
        : `${BOARD_COOKIE}=; path=/; max-age=0; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      className="pill press inline-flex items-center"
      style={{
        gap: 6,
        padding: "7px 12px",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        border: "1px solid var(--line)",
        background: on ? "var(--gold-soft)" : "var(--surface-2)",
        color: on ? "var(--on-gold)" : "var(--text-2)",
        opacity: pending ? 0.6 : 1,
      }}
    >
      <span aria-hidden>🙈</span>
      {on ? "Show real board" : "Hide gambles"}
    </button>
  );
}
