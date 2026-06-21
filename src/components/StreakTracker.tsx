import { STREAK_TARGET, STREAK_REWARD } from "@/lib/scoring";
import { Icon } from "./Icon";

// Slim dashboard card: how far along the current correct-pick run is, and what
// the next milestone pays. Pure render — caller passes the current streak.
export function StreakTracker({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  const filled = streak % STREAK_TARGET; // pips lit in the current segment (0 = just hit a milestone)
  const remaining = STREAK_TARGET - filled; // correct picks until the next +REWARD
  const justHit = filled === 0; // streak is an exact multiple — milestone banked

  return (
    <div
      className="card flex items-center"
      style={{
        gap: 12,
        padding: "12px 16px",
        background: "var(--gold-soft)",
        border: "1px solid var(--gold)",
      }}
    >
      <span
        className="grid place-items-center"
        style={{ width: 38, height: 38, borderRadius: 11, flex: "none", background: "var(--gold)", color: "var(--on-gold)" }}
      >
        <Icon name="flame" size={21} />
      </span>
      <div className="flex-1 min-w-0">
        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--on-gold)" }}>
          {streak} correct in a row{justHit ? " · +" + STREAK_REWARD + " banked!" : ""}
        </div>
        <div className="t-xs" style={{ color: "var(--on-gold)", opacity: 0.85 }}>
          {remaining} more {remaining === 1 ? "win" : "wins"} → +{STREAK_REWARD} pts
        </div>
      </div>
      {/* segment pips */}
      <div className="flex items-center" style={{ gap: 4, flex: "none" }}>
        {Array.from({ length: STREAK_TARGET }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i < filled ? "var(--gold-strong)" : "color-mix(in oklch, var(--on-gold) 22%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
