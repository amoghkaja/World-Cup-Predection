"use client";

import { useState, useTransition } from "react";
import type { Team, PodiumPrediction, TournamentPrediction, PodiumPosition } from "@/lib/types";
import { savePodiumPick, saveTournamentPrediction } from "@/app/actions";
import { PODIUM_EARLY, PODIUM_LATE, GOLDEN_BOOT_POINTS } from "@/lib/scoring";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";

export type PodiumWindowState = "pre" | "group" | "post" | "locked";

const SLOTS: { pos: PodiumPosition; label: string; hint: string; icon: string; gold?: boolean }[] = [
  { pos: 1, label: "Champion · 1st", hint: "Lifts the trophy", icon: "trophy", gold: true },
  { pos: 2, label: "Runner-up · 2nd", hint: "Loses the final", icon: "medal" },
  { pos: 3, label: "Third place · 3rd", hint: "Wins the 3rd-place game", icon: "medal" },
];

const BANNER: Record<PodiumWindowState, string> = {
  pre: "Window 1 is open — lock your podium before the first match for the full value.",
  group: "Group stage in progress — podium picks are locked until the groups finish.",
  post: "Window 2 is open — revise once if you like. A changed pick scores the lower value.",
  locked: "Podium picks are locked.",
};

export function TournamentPicker({
  teams,
  podium,
  golden,
  windowState,
}: {
  teams: Team[];
  podium: PodiumPrediction[];
  golden: TournamentPrediction | null;
  windowState: PodiumWindowState;
}) {
  const editable = windowState === "pre" || windowState === "post";
  const goldenEditable = windowState === "pre";
  const predFor = (pos: number) => podium.find((p) => p.position === pos) ?? null;

  const [picks, setPicks] = useState<Record<number, number | null>>(() => {
    const m: Record<number, number | null> = { 1: null, 2: null, 3: null };
    for (const p of podium) m[p.position] = p.team_id;
    return m;
  });
  const [boot, setBoot] = useState(golden?.text_value ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const teamById = (id: number | null) => (id == null ? null : teams.find((t) => t.id === id) ?? null);

  function pickTeam(pos: PodiumPosition, teamId: number) {
    if (!editable) return;
    setMsg(null);
    setPicks((m) => ({ ...m, [pos]: teamId }));
    setOpen(null);
    start(async () => {
      const res = await savePodiumPick({ position: pos, teamId });
      setMsg(res.ok ? { ok: true, text: "Pick saved" } : { ok: false, text: res.error });
    });
  }

  function saveBoot() {
    setMsg(null);
    start(async () => {
      const res = await saveTournamentPrediction({
        type: "golden_boot",
        teamId: null,
        textValue: boot.trim() || null,
      });
      setMsg(res.ok ? { ok: true, text: "Golden Boot saved" } : { ok: false, text: res.error });
    });
  }

  function slotValue(pos: PodiumPosition): number {
    const pred = predFor(pos);
    const cur = picks[pos];
    let revised: boolean;
    if (windowState === "pre") revised = false;
    else if (windowState === "post") revised = cur !== (pred?.original_team_id ?? null);
    else revised = pred?.revised ?? false;
    return (revised ? PODIUM_LATE : PODIUM_EARLY)[pos - 1];
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* window banner */}
      <div
        className="card flex items-start gap-3"
        style={{
          padding: "13px 15px",
          background: editable ? "var(--brand-soft)" : "var(--surface-2)",
          border: `1px solid ${editable ? "var(--brand-ring)" : "var(--line)"}`,
        }}
      >
        <Icon
          name={editable ? "unlock" : "lock"}
          size={17}
          style={{ color: editable ? "var(--brand-strong)" : "var(--text-3)", marginTop: 1, flex: "none" }}
        />
        <span className="t-sm" style={{ color: editable ? "var(--brand-strong)" : "var(--text-2)", fontWeight: 600 }}>
          {BANNER[windowState]}
        </span>
      </div>

      {SLOTS.map((s) => {
        const key = `p${s.pos}`;
        const isOpen = open === key;
        const selected = teamById(picks[s.pos]);
        return (
          <div key={key} className="card overflow-hidden" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : key)}
              disabled={!editable}
              className="w-full flex items-center gap-3.5 text-left"
              style={{
                border: "none",
                background: "transparent",
                padding: "16px 18px",
                cursor: editable ? "pointer" : "default",
              }}
            >
              <div
                className="grid place-items-center shrink-0"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: s.gold ? "var(--gold-soft)" : "var(--brand-soft)",
                  color: s.gold ? "var(--gold-strong)" : "var(--brand-strong)",
                }}
              >
                <Icon name={s.icon} size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="t-h3">{s.label}</span>
                  <span className="pill" style={{ background: "var(--gold-soft)", color: "var(--on-gold)" }}>
                    {slotValue(s.pos)} pts
                  </span>
                </div>
                <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 2 }}>
                  {s.hint}
                </div>
              </div>
              {selected ? (
                <span className="chip" style={{ fontSize: 14, padding: "6px 12px 6px 7px" }}>
                  <Flag flag={selected.flag_emoji} name={selected.name} size="sm" />
                  <span className="truncate" style={{ maxWidth: 100 }}>
                    {selected.name}
                  </span>
                </span>
              ) : (
                <span className="t-sm" style={{ color: "var(--text-3)" }}>
                  {editable ? "Choose" : "—"}
                </span>
              )}
              {editable && (
                <Icon
                  name="chevD"
                  size={18}
                  style={{
                    color: "var(--text-3)",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}
                />
              )}
            </button>

            {isOpen && editable && (
              <div className="anim-up" style={{ padding: "4px 14px 16px", borderTop: "1px solid var(--line)" }}>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", marginTop: 14 }}
                >
                  {teams.map((t) => {
                    const on = picks[s.pos] === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={pending}
                        onClick={() => pickTeam(s.pos, t.id)}
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
          </div>
        );
      })}

      {/* Golden Boot */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        <button
          type="button"
          onClick={() => setOpen(open === "boot" ? null : "boot")}
          disabled={!goldenEditable}
          className="w-full flex items-center gap-3.5 text-left"
          style={{
            border: "none",
            background: "transparent",
            padding: "16px 18px",
            cursor: goldenEditable ? "pointer" : "default",
          }}
        >
          <div
            className="grid place-items-center shrink-0"
            style={{ width: 46, height: 46, borderRadius: 14, background: "var(--gold-soft)", color: "var(--gold-strong)" }}
          >
            <Icon name="bolt" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="t-h3">Golden Boot</span>
              <span className="pill" style={{ background: "var(--gold-soft)", color: "var(--on-gold)" }}>
                {GOLDEN_BOOT_POINTS} pts
              </span>
            </div>
            <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 2 }}>
              Top scorer&rsquo;s name · locks at first kickoff
            </div>
          </div>
          {boot.trim() ? (
            <span className="chip" style={{ maxWidth: 150 }}>
              <span className="truncate">{boot.trim()}</span>
            </span>
          ) : (
            <span className="t-sm" style={{ color: "var(--text-3)" }}>
              {goldenEditable ? "Name one" : "—"}
            </span>
          )}
        </button>
        {open === "boot" && goldenEditable && (
          <div className="anim-up flex flex-col gap-2.5" style={{ padding: "14px 14px 16px", borderTop: "1px solid var(--line)" }}>
            <input
              className="input"
              placeholder="e.g. Kylian Mbappé"
              value={boot}
              onChange={(e) => setBoot(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={saveBoot} disabled={pending}>
              Save Golden Boot
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className="t-sm text-center" style={{ color: msg.ok ? "var(--brand-strong)" : "var(--bad)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
