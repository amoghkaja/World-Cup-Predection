import Image from "next/image";

// Brand mark: the World Cup trophy + wordmark + year chip.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 9 }}>
      <Image
        src="/wc26-trophy.webp"
        alt="World Cup trophy"
        width={24}
        height={28}
        priority
        style={{ height: 28, width: "auto" }}
      />
      {!compact && (
        <span className="inline-flex items-center" style={{ gap: 7 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            World Cup Pick&rsquo;em
          </span>
          <span
            style={{
              background: "var(--gold)",
              color: "var(--on-gold)",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 10.5,
              lineHeight: 1,
              padding: "3px 7px",
              borderRadius: 999,
            }}
          >
            2026
          </span>
        </span>
      )}
    </span>
  );
}
