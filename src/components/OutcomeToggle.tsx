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
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        background: "var(--surface-2)",
        padding: 4,
        borderRadius: 14,
        border: "1px solid var(--line)",
      }}
    >
      {opts.map((o) => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.k)}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 6px",
              fontWeight: 800,
              fontSize: 14,
              background: on ? "var(--brand)" : "transparent",
              color: on ? "var(--on-brand)" : "var(--text-2)",
              boxShadow: on ? "var(--shadow-sm)" : "none",
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
