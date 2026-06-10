import Link from "next/link";
import {
  getLeaderboard,
  getMatches,
  getMyPredictions,
  getProfile,
  getSetupStatus,
  tournamentLockAt,
} from "@/lib/queries";
import { isLocked, serverNow } from "@/lib/format";
import { DashboardMatchList } from "@/components/MatchCard";
import { Icon } from "@/components/Icon";
import { SetupChecklist } from "@/components/SetupChecklist";
import { PointsRecap, type RecapEntry } from "@/components/PointsRecap";

export const dynamic = "force-dynamic";

// stable "Mon, Jun 9" style eyebrow date
function eyebrowDate(now: number): string {
  return new Date(now).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const [matches, preds, profile, setup, lockAt, board] = await Promise.all([
    getMatches(),
    getMyPredictions(),
    getProfile(),
    getSetupStatus(),
    tournamentLockAt(),
    getLeaderboard(),
  ]);
  const now = serverNow();

  const setupLocked = lockAt ? isLocked(lockAt, now) : false;
  // Hard gate: until the pre-tournament picks are in, no match predictions.
  const gated = !setupLocked && !setup.complete;

  const isOpen = (kickoffIso: string, status: string) =>
    !isLocked(kickoffIso, now) && status !== "final";

  const openMatches = matches.filter((m) => isOpen(m.kickoff_at, m.status));
  const unpicked = openMatches.filter((m) => !preds.has(m.id));
  const toPick = unpicked.length;

  // Reminder: open matches kicking off within 24h that still have no pick.
  const soon = unpicked.filter(
    (m) => new Date(m.kickoff_at).getTime() - now < 24 * 3600 * 1000
  );

  // "While you were away" recap: every settled match the player had a pick on.
  // The client only surfaces ones it hasn't shown before.
  const recap: RecapEntry[] = matches
    .filter(
      (m) =>
        m.status === "final" &&
        m.home_score != null &&
        m.away_score != null &&
        preds.get(m.id)?.scored
    )
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at))
    .slice(0, 40)
    .map((m) => {
      const p = preds.get(m.id)!;
      return {
        id: m.id,
        home: m.home_team?.code ?? "?",
        homeFlag: m.home_team?.flag_emoji ?? null,
        away: m.away_team?.code ?? "?",
        awayFlag: m.away_team?.flag_emoji ?? null,
        hs: m.home_score!,
        as: m.away_score!,
        ph: p.pred_home_score,
        pa: p.pred_away_score,
        pts: p.points_awarded,
      };
    });

  const greetingName = profile?.display_name?.split(" ")[0] ?? "there";

  const my = board.find((r) => r.user_id === profile?.id);
  const stats: { value: string; label: string; gold?: boolean }[] = [
    { value: my ? `#${my.rank}` : "—", label: "Rank" },
    { value: my ? String(my.total_points) : "—", label: "Points" },
    { value: gated ? "—" : String(toPick), label: "To pick", gold: !gated && toPick > 0 },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      <PointsRecap
        entries={recap}
        totalPoints={my?.total_points ?? 0}
        rank={my?.rank ?? null}
      />
      {/* greeting + stat band */}
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 14 }}>
        <div>
          <div className="t-label" style={{ color: "var(--text-3)" }}>
            Matchday · {eyebrowDate(now)}
          </div>
          <h1 className="t-h1" style={{ marginTop: 4 }}>
            Hey {greetingName}
          </h1>
        </div>
        <div
          className="card flex"
          style={{ padding: "10px 4px", boxShadow: "none", background: "var(--surface-2)" }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="text-center"
              style={{ padding: "0 18px", borderLeft: i ? "1px solid var(--line)" : "none" }}
            >
              <div
                className="tnum"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 22,
                  color: s.gold ? "var(--gold-strong)" : "var(--text)",
                }}
              >
                {s.value}
              </div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {gated ? (
        <>
          <SetupChecklist
            championSet={setup.championSet}
            groupsDone={setup.groupsDone}
            groupsTotal={12}
            goldenSet={setup.goldenSet}
            goldenRequired={setup.goldenRequired}
          />
          <div className="card flex items-center gap-3" style={{ padding: "16px 18px" }}>
            <span
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flex: "none",
                background: "var(--surface-2)",
                color: "var(--text-3)",
              }}
            >
              <Icon name="lock" size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Match predictions are locked</div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                Finish the picks above to start predicting matches.
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* champion call-to-action */}
          <Link
            href="/tournament"
            className="lift"
            style={{
              textAlign: "left",
              background: "var(--brand-grad)",
              color: "var(--on-deep)",
              borderRadius: "var(--radius)",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "var(--gold)",
                color: "var(--on-gold)",
                display: "grid",
                placeItems: "center",
                flex: "none",
              }}
            >
              <Icon name="trophy" size={24} />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>
                Review your tournament picks
              </span>
              <span className="t-sm" style={{ display: "block", opacity: 0.85 }}>
                Podium &amp; Golden Boot lock at first kickoff — change them while you can.
              </span>
            </span>
            <Icon name="chevR" size={22} style={{ opacity: 0.9, flex: "none" }} />
          </Link>

          {/* picks-due reminder */}
          {soon.length > 0 && (
            <Link
              href={`/matches/${soon[0].id}`}
              className="card lift flex items-center gap-3"
              style={{
                padding: "14px 16px",
                background: "var(--gold-soft)",
                border: "1px solid transparent",
              }}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  flex: "none",
                  background: "var(--gold)",
                  color: "var(--on-gold)",
                }}
              >
                <Icon name="bolt" size={19} />
              </span>
              <span style={{ flex: 1, color: "var(--on-gold)" }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>
                  {soon.length} match{soon.length > 1 ? "es" : ""} lock
                  {soon.length === 1 ? "s" : ""} within 24 hours
                </span>
                <span className="t-xs" style={{ display: "block", opacity: 0.8 }}>
                  No pick = no points — get yours in before kickoff.
                </span>
              </span>
              <Icon name="chevR" size={18} style={{ color: "var(--on-gold)", flex: "none" }} />
            </Link>
          )}

          {/* filterable, day-grouped match list */}
          <DashboardMatchList
            matches={matches}
            predictions={[...preds.entries()]}
            toPickCount={toPick}
          />
        </>
      )}
    </div>
  );
}
