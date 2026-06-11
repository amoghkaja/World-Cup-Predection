import Image from "next/image";

// Brand mark: trophy + a two-line typographic lockup.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 9 }}>
      <Image
        src="/wc26-trophy.webp"
        alt=""
        width={24}
        height={28}
        priority
        style={{ height: 27, width: "auto" }}
      />
      {!compact && (
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontStretch: "112%",
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              lineHeight: 1,
              color: "var(--text-3)",
              whiteSpace: "nowrap",
            }}
          >
            World Cup
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontStretch: "110%",
              fontSize: 15.5,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Pick&rsquo;em <span style={{ color: "var(--brand)" }}>26</span>
          </span>
        </span>
      )}
    </span>
  );
}
