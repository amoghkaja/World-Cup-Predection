import Link from "next/link";
import {
  getMatches,
  getMyPredictions,
  getProfile,
  getMyPodiumPredictions,
  getMyGroupPredictions,
  getMyTournamentPredictions,
  tournamentLockAt,
} from "@/lib/queries";
import { isLocked, serverNow } from "@/lib/format";
import { DashboardMatchList } from "@/components/MatchCard";
import { Icon } from "@/components/Icon";
import { SetupChecklist } from "@/components/SetupChecklist";

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
  const [matches, preds, profile, podium, groupPreds, tourPreds, lockAt] = await Promise.all([
    getMatches(),
    getMyPredictions(),
    getProfile(),
    getMyPodiumPredictions(),
    getMyGroupPredictions(),
    getMyTournamentPredictions(),
    tournamentLockAt(),
  ]);
  const now = serverNow();

  const championSet = podium.some((p) => p.position === 1 && p.team_id != null);
  const groupsDone = [...groupPreds.values()].filter(
    (g) => g.pred_winner_team_id != null && g.pred_runnerup_team_id != null
  ).length;
  const goldenSet = tourPreds.some((p) => p.type === "golden_boot" && !!p.text_value);
  const setupLocked = lockAt ? isLocked(lockAt, now) : false;
  const showChecklist = !setupLocked && !(championSet && groupsDone >= 12);

  const isOpen = (kickoffIso: string, status: string) =>
    !isLocked(kickoffIso, now) && status !== "final";

  const openMatches = matches.filter((m) => isOpen(m.kickoff_at, m.status));
  const openCount = openMatches.length;
  const toPick = openMatches.filter((m) => !preds.has(m.id)).length;

  const greetingName = profile?.display_name?.split(" ")[0] ?? "there";

  const stats: { value: string; label: string; gold?: boolean }[] = [
    { value: "—", label: "Rank" },
    { value: "—", label: "Points" },
    { value: String(toPick), label: "To pick", gold: toPick > 0 },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
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
              style={{
                padding: "0 18px",
                borderLeft: i ? "1px solid var(--line)" : "none",
              }}
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

      {showChecklist ? (
        <SetupChecklist
          championSet={championSet}
          groupsDone={groupsDone}
          groupsTotal={12}
          goldenSet={goldenSet}
        />
      ) : (
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
            Pick your Champion
          </span>
          <span className="t-sm" style={{ display: "block", opacity: 0.85 }}>
            Tournament picks lock at first kickoff — earn the biggest bonus.
          </span>
        </span>
        <Icon name="chevR" size={22} style={{ opacity: 0.9, flex: "none" }} />
        </Link>
      )}

      {/* filterable, day-grouped match list */}
      <DashboardMatchList
        matches={matches}
        predictions={[...preds.entries()]}
        openCount={openCount}
      />
    </div>
  );
}
