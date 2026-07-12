import type { Team } from "@/lib/types";

// A stored flag emoji is two Unicode "regional indicator" letters — e.g. 🇩🇪 =
// 🇩+🇪 → ISO "de". Windows browsers don't render these as flags (they show "DE"),
// so we derive the ISO code and render a real image instead. Returns null for
// non-country emoji (e.g. the 🏳️ placeholder) so we can fall back gracefully.
function emojiToIso(flag: string): string | null {
  const cps = Array.from(flag);
  if (cps.length < 2) return null;
  const BASE = 0x1f1e6; // 🇦
  const a = cps[0].codePointAt(0)!;
  const b = cps[1].codePointAt(0)!;
  if (a < BASE || a > BASE + 25 || b < BASE || b > BASE + 25) return null;
  return String.fromCharCode(97 + (a - BASE)) + String.fromCharCode(97 + (b - BASE));
}

// Circular flag chip. Renders a real flag image (cross-platform) when the emoji
// maps to a country code, else falls back to the emoji / placeholder.
export function Flag({
  flag,
  name,
  size = "",
}: {
  flag?: string | null;
  name?: string;
  size?: "sm" | "lg" | "xl" | "";
}) {
  const iso = flag ? emojiToIso(flag) : null;
  let inner: React.ReactNode;
  if (iso) {
    inner = (
      // eslint-disable-next-line @next/next/no-img-element -- tiny external flag SVG, no Image optimization needed
      <img
        src={`https://flagcdn.com/${iso}.svg`}
        alt=""
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  } else {
    inner = flag || "🏳️";
  }
  return (
    <span className={`flag ${size}`} title={name} aria-hidden>
      {inner}
    </span>
  );
}

export function TeamBadge({
  team,
  placeholder,
  align = "left",
  big,
  sub,
}: {
  team: Team | null;
  placeholder?: string | null;
  align?: "left" | "right";
  big?: boolean;
  sub?: string;
}) {
  const name = team?.name ?? placeholder ?? "TBD";
  return (
    <span
      className={`inline-flex items-center gap-2 min-w-0 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Flag flag={team?.flag_emoji} name={name} size={big ? "lg" : ""} />
      <span className="flex flex-col min-w-0">
        <span
          className="truncate"
          style={{
            fontWeight: 700,
            fontSize: big ? 17 : 14.5,
            color: team ? "var(--text)" : "var(--text-3)",
          }}
        >
          {name}
        </span>
        {sub && (
          <span className="t-xs" style={{ color: "var(--text-3)" }}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
