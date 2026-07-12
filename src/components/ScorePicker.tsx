"use client";

// One-tap score entry: a strip of digits 0–9. Faster than a stepper (no
// repeated presses), bigger touch surface, and the selection pops.
// Legacy picks above 9 get an extra cell so they still render selected.
export function ScorePicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const cells = Array.from({ length: 10 }, (_, n) => n);
  if (value > 9) cells.push(value);

  return (
    <div className="scp" role="radiogroup" aria-label={`${label} goals`}>
      {cells.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value === n ? "on" : ""}
          disabled={disabled}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
