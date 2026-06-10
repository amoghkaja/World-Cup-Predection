"use client";

import { useMemo, useState } from "react";
import type { MatchWithTeams, Prediction } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { isLocked } from "@/lib/format";
import { scorePrediction } from "@/lib/scoring";
import { Icon } from "./Icon";
import { LocalTime } from "./LocalTime";
import { Flag } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { StatusPill } from "./StatusPill";
import { PointsBadge } from "./PointsBadge";
import { Segmented } from "./Segmented";
import { PredictionForm } from "./PredictionForm";

// derive the design's status vocab from the db status + clock
function deriveStatus(
  match: MatchWithTeams,
  locked: boolean
): "open" | "live" | "done" | "locked" {
  if (match.status === "final" && match.home_score != null) return "done";
  if (match.status === "live") return "live";
  if (locked) return "locked";
  return "open";
}

export function MatchCard({
  match,
  prediction,
}: {
  match: MatchWithTeams;
  prediction: Prediction | null;
}) {
  const locked = isLocked(match.kickoff_at);
  const status = deriveStatus(match, locked);
  const open = status === "open";
  const finished = status === "done" && match.home_score != null && match.away_score != null;

  const [editing, setEditing] = useState(false);

  const label =
    STAGE_LABELS[match.stage] + (match.group_label ? ` · Group ${match.group_label}` : "");

  const earned = finished && prediction ? scorePrediction(prediction, match) : 0;

  // for the finished view: highlight the winner, dim the loser
  const winSide =
    finished && match.home_score! !== match.away_score!
      ? match.home_score! > match.away_score!
        ? 0
        : 1
      : -1;
  const homeName = match.home_team?.name ?? match.home_placeholder ?? "TBD";
  const awayName = match.away_team?.name ?? match.away_placeholder ?? "TBD";

  // pick pill: green tick when it scored, neutral cross on a miss, brand pre-result
  const pillLook = !finished
    ? { bg: "var(--brand-soft)", fg: "var(--brand-strong)", icon: "target" }
    : earned > 0
      ? { bg: "var(--good-soft)", fg: "var(--good)", icon: "check" }
      : { bg: "var(--surface-2)", fg: "var(--text-3)", icon: "x" };

  return (
    <div className="card lift" style={{ overflow: "hidden" }}>
      {/* header strip */}
      <div className="flex items-center justify-between" style={{ padding: "11px 16px 0" }}>
        <span
          className="t-xs"
          style={{ color: "var(--text-3)", fontWeight: 700, letterSpacing: ".03em" }}
        >
          {label} · <LocalTime iso={match.kickoff_at} />
        </span>
        <StatusPill status={status} predicted={!!prediction} />
      </div>

      {/* teams — one line: home · vs / score · away */}
      <div className="flex items-center" style={{ gap: 9, padding: "13px 16px" }}>
        <Flag flag={match.home_team?.flag_emoji} name={homeName} />
        <span
          className="truncate"
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 800,
            fontSize: 15.5,
            color:
              finished && winSide === 1
                ? "var(--text-3)"
                : match.home_team
                  ? "var(--text)"
                  : "var(--text-3)",
          }}
        >
          {homeName}
        </span>
        {finished ? (
          <span
            className="tnum"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 21,
              whiteSpace: "nowrap",
              padding: "0 2px",
            }}
          >
            {match.home_score}–{match.away_score}
          </span>
        ) : (
          <span className="t-label" style={{ color: "var(--text-3)" }}>
            vs
          </span>
        )}
        <span
          className="truncate"
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 800,
            fontSize: 15.5,
            textAlign: "right",
            color:
              finished && winSide === 0
                ? "var(--text-3)"
                : match.away_team
                  ? "var(--text)"
                  : "var(--text-3)",
          }}
        >
          {awayName}
        </span>
        <Flag flag={match.away_team?.flag_emoji} name={awayName} />
      </div>

      {/* your pick — always visible at a glance while scrolling */}
      {prediction && (
        <div style={{ padding: "0 16px 13px" }}>
          <span
            className="pill"
            style={{ background: pillLook.bg, color: pillLook.fg, fontSize: 12, padding: "5px 11px" }}
          >
            <Icon name={pillLook.icon} size={12} sw={2.8} />
            Your pick {prediction.pred_home_score}–{prediction.pred_away_score}
          </span>
        </div>
      )}

      {/* footer: countdown / status · your pick · action */}
      <div
        className="flex items-center justify-between"
        style={{
          gap: 10,
          padding: "11px 16px",
          borderTop: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
          {open ? (
            <Countdown kickoff={match.kickoff_at} variant="labeled" />
          ) : (
            <span
              className="t-sm inline-flex items-center"
              style={{ color: "var(--text-3)", fontWeight: 700, gap: 5 }}
            >
              <Icon name="lock" size={13} />
              {status === "live" ? "In progress" : finished ? "Full time" : "Locked"}
            </span>
          )}
        </div>

        {open ? (
          <button
            className={`btn ${prediction ? "btn-ghost" : "btn-primary"}`}
            style={{ padding: "8px 15px", fontSize: 13.5 }}
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Close" : prediction ? "Edit" : "Predict"}
          </button>
        ) : finished && prediction ? (
          <PointsBadge pts={earned} state={earned > 0 ? undefined : "miss"} />
        ) : null}
      </div>

      {/* inline predict drawer */}
      {open && editing && (
        <div
          className="anim-up flex flex-col"
          style={{ padding: 16, borderTop: "1px solid var(--line)", gap: 14 }}
        >
          <PredictionForm
            match={match}
            existing={prediction}
            locked={false}
            compact
            onSaved={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

// stable day key (local date) + label, deterministic across server/client
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Filter = "all" | "topick" | "mine";

// Dashboard match list with the Segmented filter + day grouping (interactive island).
export function DashboardMatchList({
  matches,
  predictions,
  toPickCount,
}: {
  matches: MatchWithTeams[];
  /** [matchId, prediction] entries (Maps aren't serializable across the RSC boundary) */
  predictions: [number, Prediction][];
  toPickCount: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const predMap = useMemo(() => new Map(predictions), [predictions]);

  const list = useMemo(() => {
    return matches.filter((m) => {
      if (filter === "topick")
        return !isLocked(m.kickoff_at) && m.status !== "final" && !predMap.has(m.id);
      if (filter === "mine") return predMap.has(m.id);
      return true;
    });
  }, [matches, filter, predMap]);

  const days = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const m of list) {
      const k = dayKey(m.kickoff_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <Segmented
        options={[
          { key: "all", label: "All" },
          { key: "topick", label: "To pick", count: toPickCount },
          { key: "mine", label: "My picks" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {days.length === 0 && (
        <div
          className="card flex flex-col items-center text-center"
          style={{ padding: "32px 18px", gap: 6 }}
        >
          <span className="t-h3">No matches here</span>
          <span className="t-sm" style={{ color: "var(--text-3)", maxWidth: 280 }}>
            {filter === "topick"
              ? "You're all caught up — every open match has your pick on it."
              : "Try a different filter."}
          </span>
        </div>
      )}

      {days.map(([dk, ms], di) => (
        <div key={dk} className="flex flex-col" style={{ gap: 11 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <span className="t-h3">{dayLabel(ms[0].kickoff_at)}</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="t-xs" style={{ color: "var(--text-3)" }}>
              {ms.length} match{ms.length > 1 ? "es" : ""}
            </span>
          </div>
          <div className="grid md:grid-cols-2" style={{ gap: 13 }}>
            {ms.map((m, mi) => (
              <div
                key={m.id}
                className="anim-up"
                style={{
                  animationDelay: `${Math.min(0.06 * mi + 0.03 * di, 0.4)}s`,
                  // skip layout/paint for cards far offscreen (big mobile win)
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 190px",
                }}
              >
                <MatchCard match={m} prediction={predMap.get(m.id) ?? null} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
