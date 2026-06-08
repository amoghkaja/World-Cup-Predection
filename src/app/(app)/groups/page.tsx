import { getTeams, getMyGroupPredictions, tournamentLockAt } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { GroupPicker } from "@/components/GroupPicker";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [teams, preds, lockAt] = await Promise.all([
    getTeams(),
    getMyGroupPredictions(),
    tournamentLockAt(),
  ]);
  const locked = lockAt ? isLocked(lockAt) : false;

  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    if (!t.group_label) continue;
    if (!byGroup.has(t.group_label)) byGroup.set(t.group_label, []);
    byGroup.get(t.group_label)!.push(t);
  }
  const groups = [...byGroup.keys()].sort();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Group predictions</h1>
        <p className="text-[var(--muted)] text-sm">
          Pick who finishes 1st and 2nd in each group. +4 pts per correct team.{" "}
          {locked ? "🔒 Locked at first kickoff." : "Locks at the first kickoff."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((g) => (
          <GroupPicker
            key={g}
            group={g}
            teams={byGroup.get(g)!}
            existing={preds.get(g) ?? null}
            locked={locked}
          />
        ))}
      </div>
    </div>
  );
}
