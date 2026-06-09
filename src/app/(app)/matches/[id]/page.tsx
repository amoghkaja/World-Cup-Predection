import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch, getMyPredictions, getSetupStatus } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { LocalTime } from "@/components/LocalTime";
import { OUTCOME_POINTS, EXACT_BONUS, maxPointsForStage } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Flag } from "@/components/TeamBadge";
import { Countdown } from "@/components/Countdown";
import { StatusPill } from "@/components/StatusPill";
import { PredictionForm } from "@/components/PredictionForm";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const [match, preds, setup] = await Promise.all([
    getMatch(matchId),
    getMyPredictions(),
    getSetupStatus(),
  ]);
  if (!match) notFound();

  const existing = preds.get(match.id) ?? null;
  const locked = isLocked(match.kickoff_at);
  const open = !locked && match.status !== "final";
  const gated = open && !setup.complete;
  const status: "open" | "live" | "done" | "locked" =
    match.status === "final" && match.home_score != null
      ? "done"
      : match.status === "live"
      ? "live"
      : locked
      ? "locked"
      : "open";

  const label =
    STAGE_LABELS[match.stage] + (match.group_label ? ` · Group ${match.group_label}` : "");

  const base = OUTCOME_POINTS[match.stage];
  const exact = EXACT_BONUS[match.stage];
  const maxPts = maxPointsForStage(match.stage);

  const homeName = match.home_team?.name ?? match.home_placeholder ?? "TBD";
  const awayName = match.away_team?.name ?? match.away_placeholder ?? "TBD";

  return (
    <div className="flex flex-col" style={{ gap: 16, maxWidth: 620, margin: "0 auto" }}>
      <Link
        href="/dashboard"
        className="btn btn-ghost"
        style={{ padding: "8px 14px", alignSelf: "flex-start" }}
      >
        <Icon name="chevL" size={16} />
        Back
      </Link>

      {/* hero */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          className="flex justify-between items-center"
          style={{
            padding: "14px 18px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span className="t-sm" style={{ fontWeight: 700, color: "var(--text-2)" }}>
            {label}
          </span>
          <StatusPill status={status} predicted={!!existing} />
        </div>

        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "1fr auto 1fr", gap: 10, padding: "26px 18px 8px" }}
        >
          <div className="text-center">
            <Flag flag={match.home_team?.flag_emoji} name={homeName} size="lg" />
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>{homeName}</div>
          </div>
          <div className="t-label" style={{ color: "var(--text-3)" }}>
            vs
          </div>
          <div className="text-center">
            <Flag flag={match.away_team?.flag_emoji} name={awayName} size="lg" />
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>{awayName}</div>
          </div>
        </div>

        <div
          className="t-sm text-center"
          style={{ color: "var(--text-3)", paddingBottom: 18 }}
        >
          <LocalTime iso={match.kickoff_at} />
          {match.label ? ` · ${match.label}` : ""}
        </div>

        <div
          className="flex flex-col items-center"
          style={{ padding: 18, borderTop: "1px solid var(--line)", gap: 6 }}
        >
          <div
            className="t-label"
            style={{ color: open ? "var(--brand-strong)" : "var(--text-3)" }}
          >
            {open ? "Prediction locks in" : "Prediction locked"}
          </div>
          {open ? (
            <Countdown kickoff={match.kickoff_at} variant="big" />
          ) : (
            <div className="t-h2" style={{ color: "var(--text-3)" }}>
              Kickoff has passed
            </div>
          )}
        </div>
      </div>

      {/* prediction form — or the pre-tournament setup gate */}
      {gated ? (
        <div
          className="card flex flex-col items-center text-center"
          style={{ padding: "28px 20px", gap: 10 }}
        >
          <span
            className="grid place-items-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "var(--surface-2)",
              color: "var(--text-3)",
            }}
          >
            <Icon name="lock" size={24} />
          </span>
          <h2 className="t-h3">Finish your pre-tournament picks first</h2>
          <p className="t-sm" style={{ color: "var(--text-3)", maxWidth: 320 }}>
            Set your champion, every group&rsquo;s top two
            {setup.goldenRequired ? " and the Golden Boot" : ""} before you can predict matches.
          </p>
          <Link
            href="/dashboard"
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "10px 18px" }}
          >
            Make my picks
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 18 }}>
          <div className="flex flex-col" style={{ gap: 3, marginBottom: 14 }}>
            <h2 className="t-h2">Your prediction</h2>
            <span className="t-sm" style={{ color: "var(--text-3)" }}>
              {open ? "Pick the outcome and exact score." : "This match is locked."}
            </span>
          </div>
          <PredictionForm match={match} existing={existing} locked={!open} />
        </div>
      )}

      {/* points hint (gold) */}
      <div
        className="card"
        style={{ padding: 18, background: "var(--gold-soft)", border: "1px solid transparent" }}
      >
        <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
          <Icon name="bolt" size={20} style={{ color: "var(--gold-strong)" }} />
          <div className="t-h3" style={{ color: "var(--on-gold)" }}>
            Up to {maxPts} pts on offer
          </div>
        </div>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {[
            ["Correct result (Home / Draw / Away)", `${base} pts`],
            ["Exact score bonus", `+${exact} pts`],
          ].map(([l, r]) => (
            <div
              key={l}
              className="flex justify-between"
              style={{ fontSize: 14, color: "var(--on-gold)" }}
            >
              <span style={{ opacity: 0.85 }}>{l}</span>
              <b className="tnum">{r}</b>
            </div>
          ))}
        </div>
        <div
          className="t-xs flex"
          style={{ color: "var(--on-gold)", opacity: 0.8, marginTop: 12, gap: 6, alignItems: "flex-start" }}
        >
          <Icon name="lock" size={13} style={{ marginTop: 1, flex: "none" }} />
          Your prediction locks the instant the match kicks off — no edits after that.
        </div>
        <Link
          href="/scoring"
          className="press"
          style={{
            marginTop: 12,
            width: "100%",
            borderRadius: 12,
            background: "var(--on-gold)",
            color: "var(--gold-soft)",
            padding: "10px",
            fontWeight: 800,
            fontSize: 13.5,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Icon name="spark" size={15} />
          How points work
          <Icon name="chevR" size={15} />
        </Link>
      </div>
    </div>
  );
}
