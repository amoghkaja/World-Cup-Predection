"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MatchStage, MatchStatus, PredOutcome } from "@/lib/types";
import { elapsedSince, isLocked } from "@/lib/format";
import { Icon } from "./Icon";
import { LocalDay, LocalKickoff } from "./LocalTime";
import { Flag } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { Segmented } from "./Segmented";
import { PredictionForm } from "./PredictionForm";

/**
 * Slim shapes for the home feed — the dashboard used to serialize full DB rows
 * (104 matches × 2 embedded team records) into the RSC payload twice over.
 */
export type FeedTeam = { name: string; code: string; flag: string | null };
export type FeedMatch = {
  id: number;
  stage: MatchStage;
  group: string | null;
  kickoff: string;
  status: MatchStatus;
  home: FeedTeam | null;
  away: FeedTeam | null;
  homePh: string | null;
  awayPh: string | null;
};
export type FeedPick = {
  h: number;
  a: number;
  outcome: PredOutcome;
  pts: number;
  scored: boolean;
};

const STAGE_SHORT: Record<MatchStage, string> = {
  group: "Group",
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  third: "3rd place",
  final: "Final",
};

function stageTag(m: FeedMatch): string {
  return m.stage === "group" ? `Group ${m.group ?? ""}` : STAGE_SHORT[m.stage];
}

/** One match as a compact, tappable row. Tapping expands the predict drawer. */
export function MatchRow({
  m,
  pick,
  divider,
}: {
  m: FeedMatch;
  pick: FeedPick | null;
  divider: boolean;
}) {
  const locked = isLocked(m.kickoff);
  const open = !locked && m.status === "scheduled";
  // No game realistically runs longer than this (group: 90' + stoppage;
  // knockout: extra time + pens). Past it, the match has ended and we're just
  // waiting on the results feed — saying LIVE would be a lie.
  const maxLiveMs = (m.stage === "group" ? 150 : 195) * 60_000;
  const ended = locked && m.status !== "final" && elapsedSince(m.kickoff, maxLiveMs);
  const live = !ended && (m.status === "live" || (locked && m.status === "scheduled"));
  const [editing, setEditing] = useState(false);

  const teamLine = (t: FeedTeam | null, ph: string | null) => (
    <span className="flex items-center min-w-0" style={{ gap: 8 }}>
      <Flag flag={t?.flag} name={t?.name} size="sm" />
      <span
        className="truncate"
        style={{
          fontWeight: 600,
          fontSize: 14.5,
          color: t ? "var(--text)" : "var(--text-3)",
        }}
      >
        {t?.name ?? ph ?? "TBD"}
      </span>
    </span>
  );

  // Right-hand status: your pick / call to pick / locked.
  let right: React.ReactNode;
  if (pick) {
    right = (
      <span
        className="pill tnum"
        style={{
          background: open ? "var(--brand-soft)" : "var(--surface-2)",
          color: open ? "var(--brand-strong)" : "var(--text-2)",
          fontSize: 12.5,
          padding: "5px 10px",
        }}
      >
        {pick.h}–{pick.a}
      </span>
    );
  } else if (open) {
    right = (
      <span
        className="t-sm inline-flex items-center"
        style={{ color: "var(--brand-strong)", fontWeight: 700, gap: 3 }}
      >
        Pick
        <Icon name="chevD" size={15} sw={2.4} style={{ transform: editing ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </span>
    );
  } else {
    right = <Icon name="lock" size={15} style={{ color: "var(--text-3)" }} />;
  }

  return (
    <div style={{ borderTop: divider ? "1px solid var(--line)" : "none" }}>
      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        aria-expanded={editing}
        className="w-full flex items-center text-left press"
        style={{
          gap: 12,
          padding: "11px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          minHeight: 64,
        }}
      >
        {/* kickoff time */}
        <span className="flex flex-col items-center" style={{ width: 56, flex: "none", gap: 2 }}>
          {live ? (
            <span className="pill pill-live" style={{ fontSize: 10 }}>
              <span className="dot-live" />
              LIVE
            </span>
          ) : ended ? (
            <span className="pill pill-locked" style={{ fontSize: 10 }}>
              Ended
            </span>
          ) : (
            <span className="tnum" style={{ fontWeight: 700, fontSize: 13 }}>
              <LocalKickoff iso={m.kickoff} />
            </span>
          )}
          <span className="t-xs" style={{ color: "var(--text-3)", fontSize: 10.5 }}>
            {stageTag(m)}
          </span>
        </span>

        {/* teams */}
        <span className="flex flex-col flex-1 min-w-0" style={{ gap: 5 }}>
          {teamLine(m.home, m.homePh)}
          {teamLine(m.away, m.awayPh)}
        </span>

        {/* pick / state */}
        <span className="flex items-center" style={{ gap: 8, flex: "none" }}>
          {right}
        </span>
      </button>

      {/* inline predict drawer */}
      {editing && (
        <div
          className="anim-up flex flex-col"
          style={{
            padding: "4px 16px 16px",
            gap: 14,
            background: "var(--surface-2)",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div className="flex items-center justify-between" style={{ paddingTop: 12 }}>
            <span className="t-xs" style={{ color: "var(--text-3)", fontWeight: 600 }}>
              {open ? (
                <Countdown kickoff={m.kickoff} variant="labeled" />
              ) : (
                "Closed at kickoff"
              )}
            </span>
            <Link
              href={`/matches/${m.id}`}
              className="t-xs inline-flex items-center"
              style={{ color: "var(--text-2)", fontWeight: 650, gap: 2 }}
            >
              Match details
              <Icon name="chevR" size={13} />
            </Link>
          </div>
          <PredictionForm
            match={{
              id: m.id,
              stage: m.stage,
              home_team: m.home
                ? { name: m.home.name, code: m.home.code, flag_emoji: m.home.flag }
                : null,
              away_team: m.away
                ? { name: m.away.name, code: m.away.code, flag_emoji: m.away.flag }
                : null,
            }}
            existing={
              pick
                ? {
                    pred_home_score: pick.h,
                    pred_away_score: pick.a,
                    pred_outcome: pick.outcome,
                    scored: pick.scored,
                    points_awarded: pick.pts,
                  }
                : null
            }
            locked={!open}
            compact
            onSaved={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

type Filter = "all" | "topick" | "mine";

// Stable (timezone-independent) day key; the visible label is localized.
const dayKey = (iso: string) => iso.slice(0, 10);

/** Day-grouped, filterable home feed. */
export function DashboardMatchList({
  matches,
  picks,
  toPickCount,
}: {
  matches: FeedMatch[];
  /** [matchId, pick] entries (Maps aren't serializable across the RSC boundary) */
  picks: [number, FeedPick][];
  toPickCount: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const pickMap = useMemo(() => new Map(picks), [picks]);

  const list = useMemo(() => {
    return matches.filter((m) => {
      if (filter === "topick")
        return !isLocked(m.kickoff) && m.status === "scheduled" && !pickMap.has(m.id);
      if (filter === "mine") return pickMap.has(m.id);
      return true;
    });
  }, [matches, filter, pickMap]);

  const days = useMemo(() => {
    const map = new Map<string, FeedMatch[]>();
    for (const m of list) {
      const k = dayKey(m.kickoff);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
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

      {days.map(([dk, ms]) => (
        <section key={dk} className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-baseline justify-between px-0.5">
            <span className="t-label" style={{ color: "var(--text-2)" }}>
              <LocalDay iso={ms[0].kickoff} />
            </span>
            <span className="t-xs" style={{ color: "var(--text-3)" }}>
              {ms.length} match{ms.length > 1 ? "es" : ""}
            </span>
          </div>
          <div
            className="card"
            style={{
              overflow: "hidden",
              // skip layout/paint for sections far offscreen (big mobile win)
              contentVisibility: "auto",
              containIntrinsicSize: `auto ${ms.length * 65 + 2}px`,
            }}
          >
            {ms.map((m, i) => (
              <MatchRow key={m.id} m={m} pick={pickMap.get(m.id) ?? null} divider={i > 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
