import { getTeams, getMyTournamentPredictions, tournamentLockAt } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { TournamentPicker } from "@/components/TournamentPicker";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  const [teams, preds, lockAt] = await Promise.all([
    getTeams(),
    getMyTournamentPredictions(),
    tournamentLockAt(),
  ]);
  const locked = lockAt ? isLocked(lockAt) : false;

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Champion picks</h1>
        {lockAt && !locked && <Countdown kickoff={lockAt} />}
      </div>
      <TournamentPicker teams={teams} existing={preds} locked={locked} />
    </div>
  );
}
