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

        <div className="flex items-center" style={{ gap: 10, padding: "24px 18px 8px" }}>
          <Flag flag={match.home_team?.flag_emoji} name={homeName} size="lg" />
          <span
            className="truncate"
            style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 16.5 }}
          >
            {homeName}
          </span>
          {status === "done" && match.home_score != null ? (
            <span
              className="tnum"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 26,
                whiteSpace: "nowrap",
                padding: "0 4px",
              }}
            >
              {match.home_score}–{match.away_score}
            </span>
          ) : (
            <span className="t-label" style={{ color: "var(--text-3)" }}>
              vs
            </span>
          )}
          <span
            className="truncate"
            style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 16.5, textAlign: "right" }}
          >
            {awayName}
          </span>
          <Flag flag={match.away_team?.flag_emoji} name={awayName} size="lg" />
        </div>

        {existing && (
          <div className="flex justify-center" style={{ paddingBottom: 4 }}>
            <span
              className="pill"
              style={{
                background: "var(--brand-soft)",
                color: "var(--brand-strong)",
                fontSize: 12,
                padding: "5px 11px",
              }}
            >
              <Icon name="target" size={12} sw={2.8} />
              Your pick {existing.pred_home_score}–{existing.pred_away_score}
            </span>
          </div>
        )}

        <div
          className="t-sm text-center"
          style={{ color: "var(--text-3)", paddingBottom: 18, paddingTop: 6 }}
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
            href="/setup"
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

      {/* points on offer */}
      <div className="card" style={{ padding: 18 }}>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
          <Icon name="bolt" size={19} style={{ color: "var(--gold-strong)" }} />
          <div className="t-h3">
            Up to <span style={{ color: "var(--gold-strong)" }}>{maxPts} pts</span> on offer
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
              style={{ fontSize: 14, color: "var(--text-2)" }}
            >
              <span>{l}</span>
              <b className="tnum" style={{ color: "var(--text)" }}>
                {r}
              </b>
            </div>
          ))}
        </div>
        <Link
          href="/scoring"
          className="t-sm inline-flex items-center"
          style={{ marginTop: 14, color: "var(--brand-strong)", fontWeight: 650, gap: 4 }}
        >
          How scoring works
          <Icon name="chevR" size={14} />
        </Link>
      </div>
    </div>
  );
}
