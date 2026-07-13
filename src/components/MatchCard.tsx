"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MatchStage, MatchStatus, PredOutcome } from "@/lib/types";
import { elapsedSince, isLocked, zonedDayKey, zonedDayLabel } from "@/lib/format";
import { maxPointsForStage, tournamentDay } from "@/lib/scoring";
import { Icon } from "./Icon";
import { LocalKickoff } from "./LocalTime";
import { Flag } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { Segmented } from "./Segmented";
import { PredictPanel } from "./PredictPanel";
import { type SideState } from "./SideBetControls";
import { MatchPointsInfo } from "./MatchPointsInfo";

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
  tz,
  side,
  jokerOnMatch,
  jokerUsedElsewhere,
  live,
  unlockLabel,
}: {
  m: FeedMatch;
  pick: FeedPick | null;
  divider: boolean;
  /** Viewer's IANA timezone — kickoff clock renders in it server-side. */
  tz: string | null;
  side: SideState;
  jokerOnMatch: boolean;
  jokerUsedElsewhere: boolean;
  live: boolean;
  unlockLabel?: string;
}) {
  const locked = isLocked(m.kickoff);
  const open = !locked && m.status === "scheduled";
  // No game realistically runs longer than this (group: 90' + stoppage;
  // knockout: extra time + pens). Past it, the match has ended and we're just
  // waiting on the results feed — saying LIVE would be a lie.
  const maxLiveMs = (m.stage === "group" ? 150 : 195) * 60_000;
  const ended = locked && m.status !== "final" && elapsedSince(m.kickoff, maxLiveMs);
  const inPlay = !ended && (m.status === "live" || (locked && m.status === "scheduled"));
  const [editing, setEditing] = useState(false);

  // Broadcast team line: flag · CODE · full name (muted, ellipsized)
  const teamLine = (t: FeedTeam | null, ph: string | null) => (
    <span className="flex items-center min-w-0" style={{ gap: 10, padding: "3px 0" }}>
      <Flag flag={t?.flag} name={t?.name} />
      <span
        className="tnum"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.02em",
          width: 40,
          flex: "none",
          color: t ? "var(--text)" : "var(--text-3)",
        }}
      >
        {t?.code ?? "—"}
      </span>
      <span
        className="truncate hidden min-[400px]:inline"
        style={{ fontSize: 13, color: t ? "var(--text-2)" : "var(--text-3)" }}
      >
        {t?.name ?? ph ?? "TBD"}
      </span>
    </span>
  );

  // Meta column (right-aligned): state pill + your pick.
  let statusLine: React.ReactNode;
  if (inPlay) {
    statusLine = (
      <span className="pill pill-live">
        <span className="dot-live" />
        Live
      </span>
    );
  } else if (ended) {
    statusLine = <span className="pill pill-locked">Ended</span>;
  } else if (open) {
    statusLine = (
      <span className="tnum" style={{ fontWeight: 800, fontSize: 13.5, fontFamily: "var(--font-display)" }}>
        <LocalKickoff iso={m.kickoff} tz={tz} />
      </span>
    );
  } else {
    statusLine = <span className="pill pill-locked">Locked</span>;
  }

  let pickLine: React.ReactNode;
  if (pick) {
    pickLine = (
      <span className={`pill tnum ${open ? "pill-acc" : "pill-locked"}`}>
        {pick.h}–{pick.a}
      </span>
    );
  } else if (open) {
    pickLine = (
      <span
        className="t-sm inline-flex items-center"
        style={{ color: "var(--brand-strong)", fontWeight: 700, gap: 3 }}
      >
        Pick
        <Icon
          name="chevD"
          size={14}
          sw={2.4}
          style={{ transform: editing ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
        />
      </span>
    );
  } else {
    pickLine = <Icon name="lock" size={14} style={{ color: "var(--text-3)" }} />;
  }

  return (
    <div style={{ borderTop: divider ? "1px solid var(--line)" : "none" }}>
      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        aria-expanded={editing}
        className="w-full flex items-center text-left rowh press"
        style={{
          gap: 14,
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          minHeight: 64,
        }}
      >
        {/* teams */}
        <span className="flex flex-col flex-1 min-w-0">
          {teamLine(m.home, m.homePh)}
          {teamLine(m.away, m.awayPh)}
        </span>

        {/* meta column */}
        <span className="flex flex-col items-end" style={{ gap: 5, flex: "none", minWidth: 76 }}>
          <span className="flex items-center" style={{ gap: 6 }}>
            {jokerOnMatch && (
              <Icon name="star" size={14} sw={2} style={{ color: "var(--gold-strong)" }} aria-label="Joker" />
            )}
            {statusLine}
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span className="t-xs" style={{ color: "var(--text-3)", fontSize: 10.5 }}>
              {stageTag(m)}
            </span>
            {pickLine}
          </span>
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
          <div className="flex items-center justify-between" style={{ paddingTop: 12, gap: 10 }}>
            <span className="t-xs" style={{ color: "var(--text-3)", fontWeight: 600 }}>
              {open ? (
                <Countdown kickoff={m.kickoff} variant="labeled" />
              ) : (
                "Closed at kickoff"
              )}
            </span>
            <span className="flex items-center" style={{ gap: 10, flex: "none" }}>
              <MatchPointsInfo stage={m.stage} />
              <Link
                href={`/matches/${m.id}`}
                className="t-xs inline-flex items-center"
                style={{ color: "var(--text-2)", fontWeight: 650, gap: 2 }}
              >
                Match details
                <Icon name="chevR" size={13} />
              </Link>
            </span>
          </div>
          <PredictPanel
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
            showGambles={open}
            side={side}
            joker={jokerOnMatch}
            jokerUsedElsewhere={jokerUsedElsewhere}
            live={live}
            unlockLabel={unlockLabel}
            jokerUpside={maxPointsForStage(m.stage)}
          />
        </div>
      )}
    </div>
  );
}

type Filter = "all" | "topick" | "mine";

/** Day-grouped, filterable home feed. */
export function DashboardMatchList({
  matches,
  picks,
  toPickCount,
  tz,
  sides = [],
  jokerMatches = [],
  jokerDays = [],
  live = false,
  unlockLabel,
}: {
  matches: FeedMatch[];
  /** [matchId, pick] entries (Maps aren't serializable across the RSC boundary) */
  picks: [number, FeedPick][];
  toPickCount: number;
  /** Viewer's IANA timezone (wc_tz cookie) — a late local kickoff (8pm ET =
      midnight UTC) must group under the day people actually watch it. */
  tz: string | null;
  /** [matchId, current side-bet state] */
  sides?: [number, SideState][];
  /** match ids the joker is currently staked on */
  jokerMatches?: number[];
  /** canonical tournament days a joker is already used on */
  jokerDays?: string[];
  /** have the gambles unlocked yet? (controls show locked until then) */
  live?: boolean;
  unlockLabel?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const pickMap = useMemo(() => new Map(picks), [picks]);
  const sideMap = useMemo(() => new Map(sides), [sides]);
  const jokerSet = useMemo(() => new Set(jokerMatches), [jokerMatches]);
  const jokerDaySet = useMemo(() => new Set(jokerDays), [jokerDays]);

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
      const k = zonedDayKey(m.kickoff, tz);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list, tz]);

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
              {zonedDayLabel(ms[0].kickoff, tz)}
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
            {ms.map((m, i) => {
              const jokerOnMatch = jokerSet.has(m.id);
              return (
                <MatchRow
                  key={m.id}
                  m={m}
                  pick={pickMap.get(m.id) ?? null}
                  divider={i > 0}
                  tz={tz}
                  side={sideMap.get(m.id) ?? {}}
                  jokerOnMatch={jokerOnMatch}
                  jokerUsedElsewhere={!jokerOnMatch && jokerDaySet.has(tournamentDay(m.kickoff))}
                  live={live}
                  unlockLabel={unlockLabel}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
