import type { Team } from "@/lib/types";

// Circular flag chip (emoji), per the design handoff's .flag primitive.
export function Flag({
  flag,
  name,
  size = "",
}: {
  flag?: string | null;
  name?: string;
  size?: "sm" | "lg" | "";
}) {
  return (
    <span className={`flag ${size}`} title={name} aria-hidden>
      {flag || "🏳️"}
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
