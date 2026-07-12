import Link from "next/link";
import {
  getLeaderboard,
  getMatches,
  getMyPredictions,
  getMySideBets,
  getMyJokers,
  getMyStreak,
  getProfile,
  getSetupStatus,
  tournamentLockAt,
} from "@/lib/queries";
import { isLocked, serverNow, zonedDayLabel } from "@/lib/format";
import { featuresLive, FEATURE_CUTOFF_ISO } from "@/lib/scoring";
import { getViewerTimeZone } from "@/lib/tz";
import { maybeKickResultsSync } from "@/lib/autosync";
import {
  DashboardMatchList,
  type FeedMatch,
  type FeedPick,
} from "@/components/MatchCard";
import { type SideState } from "@/components/SideBetControls";
import { Icon } from "@/components/Icon";
import { SetupChecklist } from "@/components/SetupChecklist";
import { StreakTracker } from "@/components/StreakTracker";
import { PointsRecap, type RecapEntry } from "@/components/PointsRecap";
import { FeaturedMatch } from "@/components/FeaturedMatch";
import { DashboardRail } from "@/components/DashboardRail";

const STAGE_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinal",
  sf: "Semifinal",
  third: "Third place",
  final: "The Final",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [matches, preds, profile, setup, lockAt, board, tz, sideBets, jokers, streak] =
    await Promise.all([
      getMatches(),
      getMyPredictions(),
      getProfile(),
      getSetupStatus(),
      tournamentLockAt(),
      getLeaderboard(),
      getViewerTimeZone(),
      getMySideBets(),
      getMyJokers(),
      getMyStreak(),
    ]);
  const now = serverNow();

  // A kicked-off match without a result yet? Chase it (post-response).
  maybeKickResultsSync(matches);

  const setupLocked = lockAt ? isLocked(lockAt, now) : false;
  // Hard gate: until the pre-tournament picks are in, no match predictions.
  const gated = !setupLocked && !setup.complete;

  const isOpen = (kickoffIso: string, status: string) =>
    !isLocked(kickoffIso, now) && status !== "final";

  // Finished games move to Results & Tables — the home feed stays focused on
  // what's still to play (live + upcoming).
  const isFinished = (m: (typeof matches)[number]) =>
    m.status === "final" && m.home_score != null;
  const upcoming = matches.filter((m) => !isFinished(m));
  const finishedCount = matches.length - upcoming.length;

  const openMatches = matches.filter((m) => isOpen(m.kickoff_at, m.status));
  const unpicked = openMatches.filter((m) => !preds.has(m.id));
  const toPick = unpicked.length;

  // Reminder: open matches kicking off within 24h that still have no pick.
  const soon = unpicked.filter(
    (m) => new Date(m.kickoff_at).getTime() - now < 24 * 3600 * 1000
  );

  // Slim feed payload — full DB rows ×104 made the RSC stream several times
  // bigger than it needed to be on mobile.
  const feed: FeedMatch[] = upcoming.map((m) => ({
    id: m.id,
    stage: m.stage,
    group: m.group_label,
    kickoff: m.kickoff_at,
    status: m.status,
    home: m.home_team
      ? { name: m.home_team.name, code: m.home_team.code, flag: m.home_team.flag_emoji }
      : null,
    away: m.away_team
      ? { name: m.away_team.name, code: m.away_team.code, flag: m.away_team.flag_emoji }
      : null,
    homePh: m.home_placeholder,
    awayPh: m.away_placeholder,
  }));
  const live = featuresLive(now);
  const unlockLabel = zonedDayLabel(FEATURE_CUTOFF_ISO, tz);
  const upcomingIds = new Set(upcoming.map((m) => m.id));
  const picks: [number, FeedPick][] = [...preds.values()]
    .filter((p) => upcomingIds.has(p.match_id))
    .map((p) => [
      p.match_id,
      {
        h: p.pred_home_score,
        a: p.pred_away_score,
        outcome: p.pred_outcome,
        pts: p.points_awarded,
        scored: p.scored,
      },
    ]);

  // Side bets (BTTS + knockout ET/pens) + joker for the shown (upcoming) matches.
  // Collapse each match's bets into one SideState ({ btts?, et?, pens? }).
  const sides: [number, SideState][] = [...sideBets.entries()]
    .filter(([matchId]) => upcomingIds.has(matchId))
    .map(([matchId, bets]) => {
      const st: SideState = {};
      for (const b of bets) st[b.market] = b.pick;
      return [matchId, st];
    });
  const jokerMatches = [...jokers.byMatch.keys()].filter((id) => upcomingIds.has(id));
  const jokerDays = [...jokers.days];

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

  // Featured card: the next open match still missing a pick (or, all picked,
  // simply the next kickoff).
  const nextUp =
    [...unpicked].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))[0] ??
    [...openMatches].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))[0] ??
    null;

  // Right rail: your last 5 settled picks, oldest → newest (recap is newest-first).
  const form = recap
    .slice(0, 5)
    .map((e) => e.pts > 0)
    .reverse();

  const my = board.find((r) => r.user_id === profile?.id);
  const stats: { value: string; label: string; gold?: boolean; flame?: boolean }[] = [
    { value: my ? `#${my.rank}` : "—", label: "Rank" },
    { value: my ? String(my.total_points) : "—", label: "Points" },
    { value: gated ? "—" : String(toPick), label: "To pick", gold: !gated && toPick > 0 },
  ];
  if (streak > 0) stats.push({ value: String(streak), label: "Streak", gold: true, flame: true });

  return (
    <div className="xl:grid xl:grid-cols-[1fr_320px] xl:gap-6 xl:items-start">
      <div className="flex flex-col" style={{ gap: 16 }}>
      <PointsRecap
        entries={recap}
        totalPoints={my?.total_points ?? 0}
        rank={my?.rank ?? null}
      />

      {/* header: title + stat strip */}
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
        <h1 className="t-h1">Matches</h1>
        <Link
          href="/profile"
          className="card lift flex"
          style={{ padding: "8px 2px" }}
          aria-label="Your standing and full points breakdown"
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="text-center"
              style={{ padding: "0 16px", borderLeft: i ? "1px solid var(--line)" : "none" }}
            >
              <div
                className="tnum inline-flex items-center"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontStretch: "108%",
                  fontSize: 20,
                  gap: 3,
                  color: s.gold ? "var(--gold-strong)" : "var(--text)",
                }}
              >
                {s.flame && <Icon name="flame" size={16} sw={2} />}
                {s.value}
              </div>
              <div className="t-xs" style={{ color: "var(--text-3)", fontSize: 11 }}>
                {s.label}
              </div>
            </div>
          ))}
        </Link>
      </div>

      <StreakTracker streak={streak} />

      {gated ? (
        <>
          <SetupChecklist
            championSet={setup.championSet}
            groupsDone={setup.groupsDone}
            groupsTotal={12}
            goldenSet={setup.goldenSet}
            goldenRequired={setup.goldenRequired}
          />
          <div className="card flex items-center gap-3" style={{ padding: "14px 16px" }}>
            <span
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
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
          {/* pre-tournament: review the big calls while they're open */}
          {!setupLocked && (
            <Link
              href="/tournament"
              className="card lift flex items-center"
              style={{ padding: "13px 16px", gap: 12 }}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  flex: "none",
                  background: "var(--gold-soft)",
                  color: "var(--gold-strong)",
                }}
              >
                <Icon name="trophy" size={21} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>
                  Review your tournament picks
                </span>
                <span className="t-xs" style={{ display: "block", color: "var(--text-3)" }}>
                  Podium &amp; Golden Boot lock at the first kickoff
                </span>
              </span>
              <Icon name="chevR" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
            </Link>
          )}

          {/* picks-due reminder */}
          {soon.length > 0 && (
            <div
              className="flex items-center"
              style={{
                padding: "12px 16px",
                gap: 12,
                borderRadius: "var(--radius)",
                background: "var(--gold-soft)",
                color: "var(--on-gold)",
              }}
            >
              <Icon name="bolt" size={19} style={{ flex: "none", color: "var(--gold-strong)" }} />
              <span style={{ flex: 1, fontSize: 13.5 }}>
                <b>
                  {soon.length} match{soon.length > 1 ? "es" : ""} without a pick
                </b>{" "}
                lock{soon.length === 1 ? "s" : ""} within 24 hours.
              </span>
            </div>
          )}

          {/* featured: your next pick, broadcast navy card */}
          {nextUp && (
            <FeaturedMatch
              id={nextUp.id}
              stageLabel={
                nextUp.stage === "group"
                  ? `Group ${nextUp.group_label ?? ""}`
                  : STAGE_LABEL[nextUp.stage] ?? nextUp.stage.toUpperCase()
              }
              kickoff={nextUp.kickoff_at}
              tz={tz}
              home={
                nextUp.home_team
                  ? {
                      name: nextUp.home_team.name,
                      code: nextUp.home_team.code,
                      flag: nextUp.home_team.flag_emoji,
                    }
                  : null
              }
              away={
                nextUp.away_team
                  ? {
                      name: nextUp.away_team.name,
                      code: nextUp.away_team.code,
                      flag: nextUp.away_team.flag_emoji,
                    }
                  : null
              }
              homePh={nextUp.home_placeholder}
              awayPh={nextUp.away_placeholder}
              picked={preds.has(nextUp.id)}
            />
          )}

          {/* filterable, day-grouped match list (upcoming + live only) */}
          <DashboardMatchList
            matches={feed}
            picks={picks}
            toPickCount={toPick}
            tz={tz}
            sides={sides}
            jokerMatches={jokerMatches}
            jokerDays={jokerDays}
            live={live}
            unlockLabel={unlockLabel}
          />

          {/* finished games live in Results & Tables */}
          {finishedCount > 0 && (
            <Link
              href="/results"
              className="card lift flex items-center gap-3"
              style={{ padding: "12px 16px" }}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flex: "none",
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                }}
              >
                <Icon name="table" size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
                  {finishedCount} match{finishedCount > 1 ? "es" : ""} played
                </span>
                <span className="t-xs" style={{ display: "block", color: "var(--text-3)" }}>
                  Final scores, your points and live group tables
                </span>
              </span>
              <Icon name="chevR" size={18} style={{ color: "var(--text-3)", flex: "none" }} />
            </Link>
          )}
        </>
      )}
      </div>

      {/* desktop right rail */}
      <aside className="hidden xl:block" style={{ position: "sticky", top: 76 }}>
        <DashboardRail
          top={board.slice(0, 5)}
          myId={profile?.id ?? null}
          form={form}
          streak={streak}
        />
      </aside>
    </div>
  );
}
