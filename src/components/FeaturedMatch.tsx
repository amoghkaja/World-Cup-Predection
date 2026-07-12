import Link from "next/link";
import { Flag } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { LocalTime } from "./LocalTime";
import { Icon } from "./Icon";

export type FeaturedTeam = { name: string; code: string; flag: string | null } | null;

// "Your next pick" — navy broadcast card for the next open match without a
// prediction. Links to the full match page (score, side bets, joker).
export function FeaturedMatch({
  id,
  stageLabel,
  kickoff,
  tz,
  home,
  away,
  homePh,
  awayPh,
  picked,
}: {
  id: number;
  stageLabel: string;
  kickoff: string;
  /** viewer's IANA timezone (wc_tz cookie) */
  tz: string | null;
  home: FeaturedTeam;
  away: FeaturedTeam;
  homePh: string | null;
  awayPh: string | null;
  picked: boolean;
}) {
  const side = (t: FeaturedTeam, ph: string | null) => (
    <span className="flex flex-col items-center" style={{ gap: 8, minWidth: 0 }}>
      <Flag flag={t?.flag} name={t?.name} size="xl" />
      <span className="td" style={{ fontSize: 20 }}>
        {t?.code ?? "TBD"}
      </span>
      <span
        className="t-xs truncate"
        style={{ color: "rgb(242 245 249 / 0.6)", maxWidth: "100%" }}
      >
        {t?.name ?? ph ?? "To be decided"}
      </span>
    </span>
  );

  return (
    <Link
      href={`/matches/${id}`}
      className="card lift block anim-pop"
      style={{ background: "var(--navy)", border: 0, color: "var(--on-navy)", overflow: "hidden" }}
    >
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 8px" }}>
        <span className="t-label" style={{ color: "rgb(242 245 249 / 0.55)" }}>
          {picked ? "Next kickoff" : "Your next pick"} · {stageLabel}
        </span>
        <span
          className="pill tnum"
          style={{ background: "rgb(255 255 255 / 0.12)", color: "var(--gold)" }}
        >
          <Countdown kickoff={kickoff} variant="bare" />
        </span>
      </div>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "1fr auto 1fr", gap: 8, padding: "10px 16px 4px" }}
      >
        {side(home, homePh)}
        <span className="td" style={{ fontSize: 15, color: "rgb(242 245 249 / 0.4)", textAlign: "center" }}>
          vs
        </span>
        {side(away, awayPh)}
      </div>

      <div className="text-center" style={{ padding: "10px 16px 14px" }}>
        <span className="t-xs" style={{ color: "rgb(242 245 249 / 0.55)" }}>
          <LocalTime iso={kickoff} tz={tz} />
        </span>
      </div>

      <div
        className="flex items-center justify-center"
        style={{
          padding: "10px 16px",
          gap: 6,
          background: "rgb(255 255 255 / 0.06)",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 12.5,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: picked ? "rgb(242 245 249 / 0.8)" : "var(--gold)",
        }}
      >
        {picked ? "Review your pick" : "Make your pick"}
        <Icon name="chevR" size={14} sw={2.6} />
      </div>
    </Link>
  );
}
