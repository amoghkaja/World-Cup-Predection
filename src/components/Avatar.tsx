// Avatar: real photo when available (Google), otherwise initials on a hue-tinted disc.

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  name,
  src: rawSrc,
  size = 40,
  ring,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  ring?: string;
}) {
  const ringStyle = ring ? { boxShadow: `0 0 0 3px var(--surface), 0 0 0 5px ${ring}` } : {};
  // avatar_url is user-writable — only ever render https image sources.
  const src = rawSrc && /^https:\/\//i.test(rawSrc) ? rawSrc : null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flex: "none", ...ringStyle }}
      />
    );
  }
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const initial =
    words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : (words[0]?.[0] ?? "?").toUpperCase();
  const hue = hueFromString(name ?? "?");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        background: `oklch(0.7 0.12 ${hue})`,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: size * (initial.length > 1 ? 0.34 : 0.38),
        letterSpacing: "0.01em",
        fontFamily: "var(--font-display)",
        ...ringStyle,
      }}
    >
      {initial}
    </div>
  );
}
