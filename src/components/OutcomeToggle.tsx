"use client";

export type Outcome = "H" | "D" | "A";

export function OutcomeToggle({
  value,
  onChange,
  home,
  away,
  disabled,
}: {
  value: Outcome;
  onChange: (v: Outcome) => void;
  home: string;
  away: string;
  disabled?: boolean;
}) {
  const opts: { k: Outcome; l: string }[] = [
    { k: "H", l: home },
    { k: "D", l: "Draw" },
    { k: "A", l: away },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Match outcome"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 5,
        background: "var(--surface-2)",
        padding: 4,
        borderRadius: 12,
        border: "1px solid var(--line)",
      }}
    >
      {opts.map((o) => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.k)}
            style={{
              border: "none",
              borderRadius: 9,
              minHeight: 42,
              padding: "0 6px",
              fontWeight: 700,
              fontSize: 14,
              background: on ? "var(--brand)" : "transparent",
              color: on ? "var(--on-brand)" : "var(--text-2)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
