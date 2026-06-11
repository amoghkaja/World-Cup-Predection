import { getMatches, getTeams } from "@/lib/queries";
import { groupStandings } from "@/lib/standings";
import { maybeKickResultsSync } from "@/lib/autosync";
import { ResultsExplorer } from "@/components/ResultsExplorer";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const standings = groupStandings(teams, matches);

  // A kicked-off match without a result yet? Chase it (post-response).
  maybeKickResultsSync(matches);

  return (
    <div className="mx-auto w-full flex flex-col" style={{ maxWidth: 860, gap: 14 }}>
      <div>
        <h1 className="t-h1">Results &amp; Tables</h1>
        <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
          How the tournament is actually going — live group standings and every final score.
        </p>
      </div>
      <ResultsExplorer standings={standings} matches={matches} />
    </div>
  );
}
