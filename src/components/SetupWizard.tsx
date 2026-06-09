"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupPrediction, Team } from "@/lib/types";
import { savePodiumPick, saveTournamentPrediction } from "@/app/actions";
import { GroupPicker } from "./GroupPicker";
import { PlayerCombobox } from "./PlayerCombobox";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";

type GroupSeed = { group: string; teams: Team[]; existing: GroupPrediction | null };
const STEPS = ["Group winners", "Golden Boot", "Champion"];

export function SetupWizard({
  groups,
  teams,
  players,
  initialGolden,
  initialChampion,
}: {
  groups: GroupSeed[];
  teams: Team[];
  players: { name: string; nationality: string | null }[];
  initialGolden: string;
  initialChampion: number | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const g of groups) {
      m[g.group] = g.existing?.pred_winner_team_id != null && g.existing?.pred_runnerup_team_id != null;
    }
    return m;
  });
  const [golden, setGolden] = useState(initialGolden);
  const [champion, setChampion] = useState<number | null>(initialChampion);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const markGroup = useCallback((group: string, complete: boolean) => {
    setDone((d) => (d[group] === complete ? d : { ...d, [group]: complete }));
  }, []);

  const groupsDone = groups.filter((g) => done[g.group]).length;
  const groupsComplete = groupsDone >= groups.length;

  async function saveGolden(name: string) {
    setGolden(name);
    setPending(true);
    await saveTournamentPrediction({ type: "golden_boot", teamId: null, textValue: name.trim() || null });
    setPending(false);
  }
  async function pickChampion(teamId: number) {
    setErr(null);
    setChampion(teamId);
    setPending(true);
    const res = await savePodiumPick({ position: 1, teamId });
    setPending(false);
    if (!res.ok) setErr(res.error);
  }

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 640 }}>
      {/* centered progress header */}
      <div className="text-center" style={{ marginBottom: 18 }}>
        <div className="t-label" style={{ color: "var(--text-3)" }}>
          Set up your picks · Step {step + 1} of 3
        </div>
        <h1 className="t-h1" style={{ marginTop: 4 }}>
          {STEPS[step]}
        </h1>
        <div className="flex items-center justify-center gap-1.5" style={{ marginTop: 12 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 99,
                background: i <= step ? "var(--brand)" : "var(--line-strong)",
                transition: "all .2s",
              }}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <p className="t-sm text-center" style={{ color: "var(--text-2)" }}>
            Pick who finishes 1st &amp; 2nd in every group — they save as you go.
          </p>
          {groups.map((g) => (
            <GroupPicker
              key={g.group}
              group={g.group}
              teams={g.teams}
              existing={g.existing}
              locked={false}
              onCompleteChange={(c) => markGroup(g.group, c)}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="card flex flex-col gap-3" style={{ padding: 18 }}>
          <h2 className="t-h3">Who wins the Golden Boot?</h2>
          <p className="t-sm" style={{ color: "var(--text-2)" }}>
            Search the player you think finishes the tournament&rsquo;s top scorer.
          </p>
          <PlayerCombobox players={players} value={golden} onSelect={saveGolden} />
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 18 }}>
          <h2 className="t-h3" style={{ marginBottom: 4 }}>
            Who lifts the trophy?
          </h2>
          <p className="t-sm" style={{ color: "var(--text-2)", marginBottom: 14 }}>
            Your champion — worth the most points if you lock it early.
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
          >
            {teams.map((t) => {
              const on = champion === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={pending}
                  onClick={() => pickChampion(t.id)}
                  className="flex items-center gap-2.5 text-left"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)",
                    background: on ? "var(--brand-soft)" : "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <Flag flag={t.flag_emoji} name={t.name} size="sm" />
                  <span className="truncate flex-1" style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {t.name}
                  </span>
                  {on && <Icon name="check" size={15} sw={2.8} style={{ color: "var(--brand)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {err && (
        <p className="t-sm text-center" style={{ color: "var(--bad)", marginTop: 12 }}>
          {err}
        </p>
      )}

      {/* footer nav */}
      <div className="flex items-center gap-2" style={{ marginTop: 18 }}>
        {step > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: "none", padding: "12px 18px" }}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={(step === 0 && !groupsComplete) || (step === 1 && !golden.trim())}
            onClick={() => setStep((s) => s + 1)}
          >
            {step === 0
              ? groupsComplete
                ? "Next · Golden Boot"
                : `Pick all 12 groups (${groupsDone}/12)`
              : "Next · Champion"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={champion == null || pending}
            onClick={() => router.push("/dashboard")}
          >
            Finish — start predicting
          </button>
        )}
      </div>
    </div>
  );
}
