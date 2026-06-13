import { Icon } from "./Icon";

export function PointsBadge({
  pts,
  size = "md",
  state,
}: {
  pts: number;
  size?: "md" | "lg";
  state?: "miss" | "penalty";
}) {
  const big = size === "lg";
  // A negative total is always a penalty (red), regardless of the passed state.
  const penalty = state === "penalty" || pts < 0;
  const miss = state === "miss" && !penalty;
  const bg = penalty ? "var(--bad-soft)" : miss ? "var(--surface-2)" : "var(--gold-soft)";
  const fg = penalty ? "var(--bad)" : miss ? "var(--text-3)" : "var(--on-gold)";
  const iconColor = penalty ? "var(--bad)" : miss ? "var(--text-3)" : "var(--gold-strong)";
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 6,
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: big ? "7px 14px" : "4px 10px",
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Icon name="bolt" size={big ? 16 : 13} sw={2.4} style={{ color: iconColor }} />
      <span style={{ fontSize: big ? 18 : 13.5 }}>
        {pts > 0 ? "+" : ""}
        {pts}
      </span>
    </span>
  );
}
