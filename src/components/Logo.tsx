import Image from "next/image";

// Broadcast brand elements: the tricolor rule (host trio — red/blue/green)
// and the wordmark, anchored by the World Cup 26 trophy mark.

export function Trico({ wide, style }: { wide?: boolean; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className="trirule"
      style={{ width: wide ? "100%" : 44, flex: "none", ...style }}
    />
  );
}

// Trophy + "PICK'EM '26" (Archivo 800 uppercase, "'26" in accent) + tricolor rule.
export function Logo({
  compact = false,
  light = false,
  size = 16,
}: {
  compact?: boolean;
  light?: boolean;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center" style={{ gap: 8 }}>
      <Image
        src="/wc26-trophy.webp"
        alt=""
        width={24}
        height={28}
        priority
        style={{ height: size * 1.6, width: "auto", flex: "none" }}
      />
      <span
        className="td"
        style={{ fontSize: size, color: light ? "var(--on-navy)" : "var(--text)", whiteSpace: "nowrap" }}
      >
        Pick&rsquo;em{" "}
        <span style={{ color: light ? "var(--gold)" : "var(--brand)" }}>&rsquo;26</span>
      </span>
      {!compact && <Trico />}
    </span>
  );
}
