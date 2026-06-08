import type { Team } from "@/lib/types";

export function TeamBadge({
  team,
  placeholder,
  align = "left",
  big,
}: {
  team: Team | null;
  placeholder?: string | null;
  align?: "left" | "right";
  big?: boolean;
}) {
  const flag = team?.flag_emoji ?? "🏳️";
  const name = team?.name ?? placeholder ?? "TBD";
  return (
    <div
      className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <span className={big ? "text-3xl" : "text-2xl"} aria-hidden>
        {team ? flag : "🏳️"}
      </span>
      <span className={`font-semibold ${big ? "text-lg" : "text-sm"} ${team ? "" : "text-[var(--muted)]"}`}>
        {name}
        {team?.code ? <span className="ml-1 text-[var(--muted)] text-xs">{team.code}</span> : null}
      </span>
    </div>
  );
}
