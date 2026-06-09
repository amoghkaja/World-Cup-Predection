// Avatar: real photo when available (Google), otherwise initials on a hue-tinted disc.

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  name,
  src,
  size = 40,
  ring,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  ring?: string;
}) {
  const ringStyle = ring ? { boxShadow: `0 0 0 3px var(--surface), 0 0 0 5px ${ring}` } : {};
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
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
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
        fontSize: size * 0.38,
        fontFamily: "var(--font-display)",
        ...ringStyle,
      }}
    >
      {initial}
    </div>
  );
}
