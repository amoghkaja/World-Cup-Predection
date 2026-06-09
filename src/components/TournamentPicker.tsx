"use client";

import { useState, useTransition } from "react";
import type { Team, TournamentPrediction, TournamentPredType } from "@/lib/types";
import { saveTournamentPrediction } from "@/app/actions";
import { CHAMPION_POINTS, FINALIST_POINTS, GOLDEN_BOOT_POINTS } from "@/lib/scoring";
import { Flag } from "./TeamBadge";
import { Icon } from "./Icon";

type SlotKey = Exclude<TournamentPredType, never>;

export function TournamentPicker({
  teams,
  existing,
  locked,
}: {
  teams: Team[];
  existing: TournamentPrediction[];
  locked: boolean;
}) {
  const byType = (t: TournamentPredType) => existing.find((e) => e.type === t) ?? null;
  const teamById = (id: number | null) => (id == null ? null : teams.find((t) => t.id === id) ?? null);

  const [championId, setChampionId] = useState<number | null>(byType("champion")?.team_id ?? null);
  const [finalistId, setFinalistId] = useState<number | null>(byType("finalist")?.team_id ?? null);
  const [boot, setBoot] = useState(byType("golden_boot")?.text_value ?? "");

  const [open, setOpen] = useState<SlotKey | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function saveTeam(type: "champion" | "finalist", teamId: number) {
    if (locked) return;
    setMsg(null);
    if (type === "champion") setChampionId(teamId);
    else setFinalistId(teamId);
    setOpen(null);
    start(async () => {
      const res = await saveTournamentPrediction({ type, teamId });
      setMsg(res.ok ? { ok: true, text: "Pick updated" } : { ok: false, text: res.error });
    });
  }

  function saveBoot() {
    if (locked) return;
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

  const slots: {
    key: SlotKey;
    label: string;
    hint: string;
    pts: number;
    icon: string;
    gold?: boolean;
  }[] = [
    { key: "champion", label: "Champion", hint: "Lifts the trophy", pts: CHAMPION_POINTS, icon: "trophy", gold: true },
    { key: "finalist", label: "Other finalist", hint: "Loses the final", pts: FINALIST_POINTS, icon: "medal" },
    { key: "golden_boot", label: "Golden Boot", hint: "Top scorer's nation", pts: GOLDEN_BOOT_POINTS, icon: "bolt" },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {slots.map((s) => {
        const isOpen = open === s.key;
        const selectedId = s.key === "champion" ? championId : s.key === "finalist" ? finalistId : null;
        const selectedTeam = teamById(selectedId);
        const isText = s.key === "golden_boot";

        return (
          <div key={s.key} className="card overflow-hidden" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.key)}
              className="w-full flex items-center gap-3.5 text-left"
              style={{ border: "none", background: "transparent", padding: "16px 18px" }}
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
                <div className="flex items-center gap-2">
                  <span className="t-h3">{s.label}</span>
                  <span
                    className="pill"
                    style={{ background: "var(--gold-soft)", color: "var(--on-gold)" }}
                  >
                    {s.pts} pts
                  </span>
                </div>
                <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 2 }}>
                  {s.hint}
                </div>
              </div>
              {isText ? (
                boot.trim() ? (
                  <span className="chip" style={{ maxWidth: 150 }}>
                    <span className="truncate">{boot.trim()}</span>
                  </span>
                ) : (
                  <span className="t-sm" style={{ color: "var(--text-3)" }}>
                    Name one
                  </span>
                )
              ) : selectedTeam ? (
                <span className="chip" style={{ fontSize: 14, padding: "6px 12px 6px 7px" }}>
                  <Flag flag={selectedTeam.flag_emoji} name={selectedTeam.name} size="sm" />
                  <span className="truncate" style={{ maxWidth: 110 }}>
                    {selectedTeam.name}
                  </span>
                </span>
              ) : (
                <span className="t-sm" style={{ color: "var(--text-3)" }}>
                  Choose
                </span>
              )}
              <Icon
                name="chevD"
                size={18}
                style={{
                  color: "var(--text-3)",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform .2s",
                }}
              />
            </button>

            {isOpen && (
              <div
                className="anim-up"
                style={{ padding: "4px 14px 16px", borderTop: "1px solid var(--line)" }}
              >
                {isText ? (
                  <div className="flex flex-col gap-2.5" style={{ marginTop: 14 }}>
                    <input
                      className="input"
                      placeholder="e.g. Kylian Mbappé"
                      value={boot}
                      disabled={locked}
                      onChange={(e) => setBoot(e.target.value)}
                    />
                    {!locked && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={saveBoot}
                        disabled={pending}
                      >
                        Save Golden Boot
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      marginTop: 14,
                    }}
                  >
                    {teams.map((t) => {
                      const on = selectedId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={locked || pending}
                          onClick={() => saveTeam(s.key as "champion" | "finalist", t.id)}
                          className="flex items-center gap-2.5 text-left"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)",
                            background: on ? "var(--brand-soft)" : "var(--surface)",
                            cursor: locked ? "not-allowed" : "pointer",
                          }}
                        >
                          <Flag flag={t.flag_emoji} name={t.name} size="sm" />
                          <span
                            className="truncate flex-1"
                            style={{ fontWeight: 700, fontSize: 13.5 }}
                          >
                            {t.name}
                          </span>
                          {on && (
                            <Icon name="check" size={15} sw={2.8} style={{ color: "var(--brand)" }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {locked && (
        <p className="t-sm text-center" style={{ color: "var(--text-3)" }}>
          <Icon name="lock" size={13} sw={2.4} style={{ verticalAlign: "-2px" }} /> Tournament
          picks are locked.
        </p>
      )}
      {msg && (
        <p
          className="t-sm text-center"
          style={{ color: msg.ok ? "var(--brand-strong)" : "var(--bad)" }}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
