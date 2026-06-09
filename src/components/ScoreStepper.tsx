"use client";

import { Icon } from "./Icon";

export function ScoreStepper({
  value,
  onChange,
  accent,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  disabled?: boolean;
}) {
  const btn = (dir: number, icon: string) => (
    <button
      type="button"
      disabled={disabled}
      aria-label={dir < 0 ? "decrease score" : "increase score"}
      onClick={() => onChange(Math.max(0, Math.min(20, value + dir)))}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--surface-2)",
        color: disabled ? "var(--text-3)" : "var(--text)",
        display: "grid",
        placeItems: "center",
        flex: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <Icon name={icon} size={18} sw={2.4} />
    </button>
  );
  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      {btn(-1, "minus")}
      <div
        className="tnum"
        style={{
          width: 50,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 32,
          color: accent || "var(--text)",
        }}
      >
        {value}
      </div>
      {btn(1, "plus")}
    </div>
  );
}
