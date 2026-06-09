"use client";

// Segmented control matching the design's .seg / .seg-btn primitives.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`seg-btn ${value === o.key ? "on" : ""}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {o.count != null && o.count > 0 && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
