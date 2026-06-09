import { getTeams, getMyGroupPredictions, tournamentLockAt } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { GROUP_QUALIFIER_POINTS } from "@/lib/scoring";
import { GroupPicker } from "@/components/GroupPicker";
import { Icon } from "@/components/Icon";
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

  const total = groups.length || 12;
  const done = groups.filter((g) => {
    const p = preds.get(g);
    return p?.pred_winner_team_id != null && p?.pred_runnerup_team_id != null;
  }).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-h1">Group predictions</h1>
          <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 4 }}>
            Call the top two in each group. Correct winner = {GROUP_QUALIFIER_POINTS} pts,
            runner-up = {GROUP_QUALIFIER_POINTS} pts.
            {locked ? " Locked at first kickoff." : ""}
          </p>
        </div>
        <span className="chip">
          <Icon name="grid" size={14} style={{ color: "var(--brand)" }} />
          {done}/{total} set
        </span>
      </header>

      {/* progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: "var(--surface-2)",
          overflow: "hidden",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--brand)",
            borderRadius: 99,
            transition: "width .4s cubic-bezier(.2,.8,.3,1)",
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-3.5">
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
