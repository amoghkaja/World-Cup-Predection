import { getMatches, getMyPredictions } from "@/lib/queries";
import { isLocked, serverNow } from "@/lib/format";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [matches, preds] = await Promise.all([getMatches(), getMyPredictions()]);
  const now = serverNow();

  const upcoming = matches.filter((m) => !isLocked(m.kickoff_at, now));
  const locked = matches.filter((m) => isLocked(m.kickoff_at, now)).reverse();

  const predictedCount = upcoming.filter((m) => preds.has(m.id)).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">Upcoming matches</h1>
        <p className="text-[var(--muted)] text-sm">
          {upcoming.length} open · {predictedCount} predicted · predict early for bonus points.
        </p>
      </div>

      {upcoming.length === 0 && (
        <p className="text-[var(--muted)]">No upcoming matches. Check the leaderboard!</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {upcoming.slice(0, 24).map((m) => (
          <MatchCard key={m.id} match={m} prediction={preds.get(m.id) ?? null} />
        ))}
      </div>

      {locked.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-4">Locked / finished</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {locked.slice(0, 12).map((m) => (
              <MatchCard key={m.id} match={m} prediction={preds.get(m.id) ?? null} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
