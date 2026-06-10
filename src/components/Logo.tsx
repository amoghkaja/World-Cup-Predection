import Image from "next/image";

// Brand mark: the World Cup trophy + two-line wordmark + year chip.
// Two lines keeps it inside the mobile header next to the icon buttons.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 8 }}>
      <Image
        src="/wc26-trophy.webp"
        alt="World Cup trophy"
        width={24}
        height={28}
        priority
        style={{ height: 28, width: "auto" }}
      />
      {!compact && (
        <span className="flex flex-col" style={{ gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 13.5,
              letterSpacing: "-0.015em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            World Cup
          </span>
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 13.5,
                letterSpacing: "-0.015em",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Pick&rsquo;em
            </span>
            <span
              style={{
                background: "var(--gold)",
                color: "var(--on-gold)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 9.5,
                lineHeight: 1,
                padding: "2px 6px",
                borderRadius: 999,
              }}
            >
              2026
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
