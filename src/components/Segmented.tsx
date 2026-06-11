"use client";

// Segmented filter control.
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
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
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
