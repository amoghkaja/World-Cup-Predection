import Image from "next/image";

// Broadcast brand elements: the tricolor rule (host trio — red/blue/green)
// and the wordmark, anchored by the official WC26 mark.

export function Trico({ wide, style }: { wide?: boolean; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className="trirule"
      style={{ width: wide ? "100%" : 44, flex: "none", ...style }}
    />
  );
}

// Official mark + "WORLD CUP PICK'EM '26" (Archivo 800 uppercase, "'26" in
// accent) + tricolor rule. The mark is theme-swapped so its tile always
// contrasts with the bar behind it: dark-background emblem on light surfaces,
// white-tile trophy on dark ones.
export function Logo({
  compact = false,
  light = false,
  size = 16,
}: {
  compact?: boolean;
  light?: boolean;
  size?: number;
}) {
  const markStyle: React.CSSProperties = { height: size * 1.7, width: "auto", flex: "none" };
  return (
    <span className="inline-flex items-center" style={{ gap: 8 }}>
      <Image
        src="/wc26-emblem.webp"
        alt=""
        width={960}
        height={1482}
        priority
        className="only-light"
        style={markStyle}
      />
      <Image
        src="/wc26-trophy.webp"
        alt=""
        width={560}
        height={660}
        priority
        className="only-dark"
        style={markStyle}
      />
      <span
        className="td"
        style={{ fontSize: size, color: light ? "var(--on-navy)" : "var(--text)", whiteSpace: "nowrap" }}
      >
        World Cup Pick&rsquo;em{" "}
        <span style={{ color: light ? "var(--gold)" : "var(--brand)" }}>&rsquo;26</span>
      </span>
      {!compact && <Trico />}
    </span>
  );
}
