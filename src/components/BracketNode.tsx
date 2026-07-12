import Link from "next/link";
import type { MatchWithTeams } from "@/lib/types";
import { isLocked, decidedNoteNamed } from "@/lib/format";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";
import { StatusPill } from "./StatusPill";

// A single knockout tie. Clicking links to the match's prediction page.
// Score predictions happen per-match via the existing PredictionForm — this is
// a navigation node, not a tap-to-advance writer.
export function BracketNode({
  match,
  predicted,
}: {
  match: MatchWithTeams;
  predicted?: boolean;
}) {
  const locked = isLocked(match.kickoff_at);
  const isFinal = match.stage === "final";
  const done = match.status === "final";

  const status: "open" | "live" | "done" | "locked" = done
    ? "done"
    : match.status === "live"
      ? "live"
      : locked
        ? "locked"
        : "open";

  const row = (
    team: MatchWithTeams["home_team"],
    placeholder: string | null,
    score: number | null,
    isTop: boolean,
  ) => {
    const empty = !team;
    const won = done && match.winner_team_id != null && team?.id === match.winner_team_id;
    return (
      <div
        className="flex items-center px-3"
        style={{
          gap: 8,
          padding: "8px 12px",
          borderTop: isTop ? "none" : "1px solid var(--line)",
          background: won ? "var(--brand-soft)" : "transparent",
          boxShadow: won ? "inset 2px 0 0 var(--brand)" : "none",
        }}
      >
        {empty ? (
          <span
            className="flag sm"
            style={{ background: "var(--surface-2)", color: "var(--text-3)", fontSize: 10 }}
          >
            ?
          </span>
        ) : (
          <Flag flag={team!.flag_emoji} name={team!.name} size="sm" />
        )}
        <span
          className="truncate flex-1"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: empty ? 600 : 750,
            fontSize: 12.5,
            color: empty ? "var(--text-3)" : won ? "var(--brand-strong)" : "var(--text)",
          }}
        >
          {team ? team.name : (placeholder ?? "TBD")}
        </span>
        {done && score != null && (
          <span
            className="tnum"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}
          >
            {score}
          </span>
        )}
        {won && (
          <Icon
            name={isFinal ? "trophy" : "check"}
            size={14}
            sw={2.6}
            style={{ color: isFinal ? "var(--gold-strong)" : "var(--brand)" }}
          />
        )}
      </div>
    );
  };

  return (
    <Link
      href={`/matches/${match.id}`}
      className="card lift block overflow-hidden"
      style={{
        padding: 0,
        borderColor: predicted ? "var(--brand-ring)" : "var(--line)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}
      >
        <span className="t-xs" style={{ color: "var(--text-3)", fontWeight: 700 }}>
          {match.label ?? "Tie"}
        </span>
        <StatusPill status={status} predicted={predicted} />
      </div>
      {row(match.home_team, match.home_placeholder, match.home_score, true)}
      {row(match.away_team, match.away_placeholder, match.away_score, false)}
      {done && decidedNoteNamed(match, match.home_team?.code, match.away_team?.code) && (
        <div
          className="t-xs text-center"
          style={{ color: "var(--text-3)", padding: "3px 0 5px", background: "var(--surface-2)" }}
        >
          {decidedNoteNamed(match, match.home_team?.code, match.away_team?.code)}
        </div>
      )}
    </Link>
  );
}
