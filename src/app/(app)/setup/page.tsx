import { redirect } from "next/navigation";
import {
  getTeams,
  getPlayers,
  getMyGroupPredictions,
  getMyTournamentPredictions,
  getMyPodiumPredictions,
  getSetupStatus,
  tournamentLockAt,
} from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { SetupWizard } from "@/components/SetupWizard";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function SetupPage() {
  const [teams, players, groupPreds, tourPreds, podium, setup, lockAt] = await Promise.all([
    getTeams(),
    getPlayers(),
    getMyGroupPredictions(),
    getMyTournamentPredictions(),
    getMyPodiumPredictions(),
    getSetupStatus(),
    tournamentLockAt(),
  ]);

  // Nothing to set up once it's done or everything has locked.
  if ((lockAt && isLocked(lockAt)) || setup.complete) redirect("/dashboard");

  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    if (!t.group_label) continue;
    (byGroup.get(t.group_label) ?? byGroup.set(t.group_label, []).get(t.group_label)!).push(t);
  }
  const groups = GROUP_LABELS.filter((g) => byGroup.has(g)).map((g) => ({
    group: g,
    teams: byGroup.get(g)!,
    existing: groupPreds.get(g) ?? null,
  }));

  const golden = tourPreds.find((p) => p.type === "golden_boot")?.text_value ?? "";
  const champion = podium.find((p) => p.position === 1)?.team_id ?? null;

  return (
    <SetupWizard
      groups={groups}
      teams={teams}
      players={players}
      initialGolden={golden}
      initialChampion={champion}
    />
  );
}
