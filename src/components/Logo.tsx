import { Icon } from "./Icon";

// Brand mark: trophy glyph in a rounded green tile + wordmark.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="grid place-items-center"
        style={{ width: 30, height: 30, borderRadius: 9, background: "var(--brand)" }}
      >
        <Icon name="trophy" size={17} style={{ color: "var(--on-brand)" }} />
      </span>
      {!compact && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-0.02em",
          }}
        >
          World Cup Pick&rsquo;em
        </span>
      )}
    </span>
  );
}
