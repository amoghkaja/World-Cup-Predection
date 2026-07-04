import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { TAG_LEADERBOARD, TAG_MATCHES, TAG_PLAYERS } from "@/lib/queries";
import {
  settleMatchSideEffects,
  recomputeStreaks,
  rescoreMatchPredictions,
  captureDailyRankSnapshot,
} from "@/lib/settle";
import type { Match, MatchStage, Team } from "@/lib/types";

// Single call to football-data.org returns all 104 World Cup matches. We update
// kickoff times, fill knockout teams as the bracket fills, apply final scores, and
// re-score predictions — the same scorePrediction the admin panel uses.
//
// Trigger:  curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/sync-results

export const dynamic = "force-dynamic";

const API = "https://api.football-data.org/v4/competitions/WC/matches";

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE: "group",
  LEAGUE_STAGE: "group", // football-data's label for new expanded formats
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
};
const FINISHED = new Set(["FINISHED", "AWARDED"]);
// Feed phases during which the game is on (docs lookup_tables: status enum).
const LIVE = new Set(["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"]);

interface FdTeam {
  id: number | null;
  name: string | null;
  tla: string | null;
}
interface FdScore {
  home: number | null;
  away: number | null;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: string | null;
    duration?: string | null; // "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
    fullTime: FdScore; // cumulative total — INCLUDES extra-time AND shootout goals
    regularTime?: FdScore | null; // 90-minute score; what we store as home/away
    extraTime?: FdScore | null; // goals scored only in ET
    penalties?: FdScore | null; // shootout-only goals
  };
}
interface FdResponse {
  matches?: FdMatch[];
  message?: string;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Header-only, constant-time comparison. The secret is never accepted in the
// query string (URLs end up in access logs).
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Minimum spacing between AUTO-triggered runs (page-render self-heal). The
// scheduled cron and the admin button bypass the claim but still stamp the row.
const AUTO_THROTTLE_MS = 3 * 60_000;

/**
 * Claim the right to run, globally. Auto-triggered runs (src=auto) only proceed
 * if no sync stamped the row within the window — one atomic conditional UPDATE,
 * so concurrent instances can't all pass. Other sources always run and stamp.
 * Best-effort: if migration 0020 isn't applied, behave as before (run).
 */
async function claimSyncRun(admin: ReturnType<typeof createAdminClient>, auto: boolean): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    if (!auto) {
      await admin.from("sync_throttle").update({ last_run_at: now }).eq("id", 1);
      return true;
    }
    const cutoff = new Date(Date.now() - AUTO_THROTTLE_MS).toISOString();
    const { data, error } = await admin
      .from("sync_throttle")
      .update({ last_run_at: now })
      .eq("id", 1)
      .lt("last_run_at", cutoff)
      .select("id");
    if (error) return true; // table missing / transient — don't block the sync
    return (data ?? []).length > 0;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "FOOTBALL_DATA_KEY is not set" }, { status: 500 });
  }

  // Claim the run BEFORE spending football-data budget — auto-triggered syncs
  // from many warm instances collapse to at most one per window.
  const auto = req.nextUrl.searchParams.get("src") === "auto";
  const admin = createAdminClient();
  if (!(await claimSyncRun(admin, auto))) {
    return NextResponse.json({ ok: true, skipped: "throttled" });
  }

  const res = await fetch(API, { headers: { "X-Auth-Token": apiKey }, cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `football-data.org ${res.status}` }, { status: 502 });
  }
  const json = (await res.json()) as FdResponse;
  const apiMatches = json.matches ?? [];
  if (apiMatches.length === 0) {
    return NextResponse.json({ ok: false, error: json.message ?? "no matches returned" }, { status: 502 });
  }
  const [{ data: teamsData }, { data: matchesData }] = await Promise.all([
    admin.from("teams").select("*"),
    admin.from("matches").select("*"),
  ]);
  const teams = (teamsData ?? []) as Team[];
  const matches = (matchesData ?? []) as Match[];

  // Resolve an API team to our team id, by 3-letter code (tla) or normalized name.
  const byKey = new Map<string, number>();
  for (const t of teams) {
    if (t.code) byKey.set(norm(t.code), t.id);
    byKey.set(norm(t.name), t.id);
  }
  // football-data.org tla → our code, where they disagree.
  const TLA_ALIAS: Record<string, string> = { cur: "cuw", ury: "uru" };
  const resolve = (t: FdTeam | undefined): number | null => {
    if (!t) return null;
    const tla = t.tla ? norm(t.tla) : "";
    if (tla && byKey.has(tla)) return byKey.get(tla)!;
    if (tla && TLA_ALIAS[tla] && byKey.has(TLA_ALIAS[tla])) return byKey.get(TLA_ALIAS[tla])!;
    if (t.name && byKey.has(norm(t.name))) return byKey.get(norm(t.name))!;
    return null;
  };

  // Index our matches: by unordered team pair within a stage; and by stage (ordered).
  const pairKey = (stage: string, a: number, b: number) =>
    `${stage}|${Math.min(a, b)}-${Math.max(a, b)}`;
  const ourByPair = new Map<string, Match>();
  const ourByStage = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.home_team_id && m.away_team_id) {
      ourByPair.set(pairKey(m.stage, m.home_team_id, m.away_team_id), m);
    }
    (ourByStage.get(m.stage) ?? ourByStage.set(m.stage, []).get(m.stage)!).push(m);
  }
  for (const arr of ourByStage.values()) {
    arr.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at) || a.id - b.id);
  }
  // API knockout matches grouped by stage, chronological (for order-based mapping pre-draw).
  const apiByStage = new Map<MatchStage, FdMatch[]>();
  for (const fx of apiMatches) {
    const st = STAGE_MAP[fx.stage];
    if (!st) continue;
    (apiByStage.get(st) ?? apiByStage.set(st, []).get(st)!).push(fx);
  }
  for (const arr of apiByStage.values()) {
    arr.sort((a, b) => a.utcDate.localeCompare(b.utcDate) || a.id - b.id);
  }

  const report = {
    timeUpdates: 0,
    teamsSet: 0,
    statusUpdates: 0,
    applied: [] as number[],
    unresolved: new Set<string>(),
    unmatched: [] as string[],
    deferred: [] as string[], // KO finished beyond regulation but regularTime not in yet
  };

  async function applyMatch(our: Match, fx: FdMatch, homeId: number | null, awayId: number | null) {
    const teamsKnown = homeId != null && awayId != null;
    const updates: Record<string, unknown> = {};

    if (new Date(our.kickoff_at).getTime() !== new Date(fx.utcDate).getTime()) {
      updates.kickoff_at = fx.utcDate;
    }
    if (teamsKnown && (our.home_team_id == null || our.away_team_id == null)) {
      updates.home_team_id = homeId;
      updates.away_team_id = awayId;
      report.teamsSet++;
    }

    // football-data v4: score.fullTime is the CUMULATIVE total (incl. extra time
    // AND the shootout) — a 1-1 won on pens can report an odd/cumulative fullTime.
    // We store the 90-MINUTE score (score.regularTime). For a KNOCKOUT we only
    // fall back to fullTime when the feed EXPLICITLY says the tie was decided in
    // regulation (rawDur === "REGULAR"); if `duration` is missing or beyond-90 a
    // fullTime fallback risks storing ET/shootout goals as the 90' score, so we
    // wait for regularTime instead. Group games are always equal, so it's safe.
    const rawDur = fx.score.duration ? fx.score.duration.toUpperCase() : null;
    const dur = rawDur ?? "REGULAR";
    const beyondReg = dur === "EXTRA_TIME" || dur === "PENALTY_SHOOTOUT";
    const reg: FdScore | null =
      fx.score.regularTime?.home != null
        ? fx.score.regularTime
        : our.stage === "group" || rawDur === "REGULAR"
          ? fx.score.fullTime
          : null;
    const scoreReady = reg != null && reg.home != null && reg.away != null;

    // A level 90' knockout that still produced a winner MUST have been settled
    // beyond regulation (extra time or a shootout). If the feed hasn't told us yet
    // WHICH (no/late `duration`), we can't finalize: the ET/pens side bets settle
    // off decided_in and guessing "regular" would pay them out wrong. Wait it out.
    const hasWinner = fx.score.winner === "HOME_TEAM" || fx.score.winner === "AWAY_TEAM";
    const undecidedBeyond =
      our.stage !== "group" && scoreReady && reg!.home === reg!.away && hasWinner && !beyondReg;

    const finished = FINISHED.has(fx.status) && scoreReady && teamsKnown && !undecidedBeyond;

    // Delay guard diagnostic: the feed marks this knockout finished but we're
    // deliberately holding off — either the 90' score (regularTime) hasn't landed
    // or the ET/pens split isn't known yet. It settles on the poll the data lands
    // (or the admin enters it by hand). Never store a guessed knockout scoreline.
    if (FINISHED.has(fx.status) && teamsKnown && our.stage !== "group" && !finished) {
      report.deferred.push(our.label ?? String(our.id));
    }

    let needRescore = false;
    if (finished && reg) {
      const ourHomeId = (updates.home_team_id as number | undefined) ?? our.home_team_id;
      const sameOrder = ourHomeId === homeId;
      const flip = (s: FdScore): { home: number | null; away: number | null } =>
        sameOrder ? { home: s.home, away: s.away } : { home: s.away, away: s.home };
      const { home: oh, away: oa } = flip(reg);
      const winnerId =
        our.stage === "group"
          ? null
          : fx.score.winner === "HOME_TEAM"
            ? homeId
            : fx.score.winner === "AWAY_TEAM"
              ? awayId
              : null;
      // How the tie was decided (group rows always null → behaves exactly as
      // before). We only reach here for a knockout once decided_in is knowable —
      // a level 90' with an unknown ET/pens split was deferred above — so a
      // missing `duration` here means a decisive 90' result: regular time.
      const decidedIn =
        our.stage === "group"
          ? null
          : rawDur === "PENALTY_SHOOTOUT"
            ? "penalties"
            : rawDur === "EXTRA_TIME"
              ? "extra_time"
              : "regular";
      const et = fx.score.extraTime?.home != null ? flip(fx.score.extraTime) : { home: null, away: null };
      const pens =
        fx.score.penalties?.home != null ? flip(fx.score.penalties) : { home: null, away: null };
      if (
        our.status !== "final" ||
        our.home_score !== oh ||
        our.away_score !== oa ||
        our.winner_team_id !== winnerId ||
        (our.decided_in ?? null) !== decidedIn ||
        (our.pens_home ?? null) !== pens.home ||
        (our.et_home ?? null) !== et.home
      ) {
        updates.home_score = oh;
        updates.away_score = oa;
        updates.winner_team_id = winnerId;
        updates.status = "final";
        updates.decided_in = decidedIn;
        updates.et_home = et.home;
        updates.et_away = et.away;
        updates.pens_home = pens.home;
        updates.pens_away = pens.away;
        needRescore = true;
      }
    }

    // Mirror the feed's live phase. Status arrives promptly even on the free
    // tier (only the scoreline is delayed), so LIVE/ended states in the UI are
    // data-driven instead of guessed from kickoff time. FINISHED with a still-
    // missing score also maps to "live" — settled only once numbers arrive.
    if (
      !finished &&
      teamsKnown &&
      our.status === "scheduled" &&
      (LIVE.has(fx.status) || FINISHED.has(fx.status))
    ) {
      updates.status = "live";
      report.statusUpdates++;
    }

    if (Object.keys(updates).length === 0) return;
    if (updates.kickoff_at) report.timeUpdates++;

    const { data: updated } = await admin
      .from("matches")
      .update(updates)
      .eq("id", our.id)
      .select("*")
      .single();
    if (!updated) return;

    if (needRescore) {
      report.applied.push(our.id);
      // Main picks first, then side bets + joker (the joker reads the freshly
      // written prediction points). Shared helpers — identical to the admin
      // saveMatchResult path. The global streak rebuild runs once per sync.
      await rescoreMatchPredictions(admin, updated as Match);
      await settleMatchSideEffects(admin, updated as Match);
    }
  }

  // Group games: match by team pair.
  for (const fx of apiMatches) {
    if (STAGE_MAP[fx.stage] !== "group") continue;
    const homeId = resolve(fx.homeTeam);
    const awayId = resolve(fx.awayTeam);
    if (homeId == null) report.unresolved.add(fx.homeTeam?.name ?? "?");
    if (awayId == null) report.unresolved.add(fx.awayTeam?.name ?? "?");
    if (homeId == null || awayId == null) continue;
    const our = ourByPair.get(pairKey("group", homeId, awayId));
    if (!our) {
      report.unmatched.push(`${fx.homeTeam.name} v ${fx.awayTeam.name}`);
      continue;
    }
    await applyMatch(our, fx, homeId, awayId);
  }

  // Knockout: prefer matching by team pair (stable even if kickoff times move).
  // Only rows that still lack teams fall back to chronological order — and a
  // kickoff-time update on every sync keeps that order aligned with the API.
  for (const [stage, apiArr] of apiByStage) {
    if (stage === "group") continue;
    const usedOur = new Set<number>();
    const orderFallback: FdMatch[] = [];

    for (const fx of apiArr) {
      const homeId = resolve(fx.homeTeam);
      const awayId = resolve(fx.awayTeam);
      const our =
        homeId != null && awayId != null
          ? ourByPair.get(pairKey(stage, homeId, awayId))
          : undefined;
      if (our) {
        usedOur.add(our.id);
        await applyMatch(our, fx, homeId, awayId);
      } else {
        orderFallback.push(fx);
      }
    }

    const ourRemaining = (ourByStage.get(stage) ?? []).filter((m) => !usedOur.has(m.id));
    for (let i = 0; i < Math.min(ourRemaining.length, orderFallback.length); i++) {
      const fx = orderFallback[i];
      await applyMatch(ourRemaining[i], fx, resolve(fx.homeTeam), resolve(fx.awayTeam));
    }
  }

  // One-time: populate the player list (Golden Boot picker) from squads. Only
  // runs when the table is empty, so it costs exactly one extra API call ever.
  let playersImported = 0;
  const { count: playerCount } = await admin
    .from("players")
    .select("id", { count: "exact", head: true });
  if ((playerCount ?? 0) === 0) {
    const tRes = await fetch("https://api.football-data.org/v4/competitions/WC/teams", {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
    if (tRes.ok) {
      const tJson = (await tRes.json()) as {
        teams?: {
          squad?: { id: number; name: string; nationality: string | null; position: string | null }[];
        }[];
      };
      const players = (tJson.teams ?? []).flatMap((t) =>
        (t.squad ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          nationality: p.nationality ?? null,
          position: p.position ?? null,
        }))
      );
      for (let i = 0; i < players.length; i += 500) {
        await admin.from("players").upsert(players.slice(i, i + 500), { onConflict: "id" });
      }
      playersImported = players.length;
    }
  }

  // Refresh the cached match list / leaderboard so pages pick the changes up
  // immediately instead of waiting out the revalidate window.
  if (
    report.applied.length > 0 ||
    report.teamsSet > 0 ||
    report.timeUpdates > 0 ||
    report.statusUpdates > 0
  ) {
    revalidateTag(TAG_MATCHES, "max");
  }
  if (report.applied.length > 0) {
    // Rebuild streak bonuses once for the whole batch, then refresh.
    await recomputeStreaks(admin);
    revalidateTag(TAG_LEADERBOARD, "max");
  }
  // Once-per-day rank snapshot for the leaderboard movement arrows (no-ops if
  // already captured today). Cheap and runs every sync so the day rolls over.
  await captureDailyRankSnapshot(admin);
  if (playersImported > 0) {
    revalidateTag(TAG_PLAYERS, "max");
  }

  // Feed diagnostics: what football-data is actually reporting right now —
  // fixture counts per raw stage string, plus every fixture around "now".
  // Lets the action logs answer "why didn't a result land?" definitively.
  const stageCounts: Record<string, number> = {};
  for (const fx of apiMatches) {
    stageCounts[fx.stage] = (stageCounts[fx.stage] ?? 0) + 1;
  }
  const nowMs = Date.now();
  const recent = apiMatches
    .filter((fx) => {
      const t = new Date(fx.utcDate).getTime();
      return t > nowMs - 8 * 3600_000 && t < nowMs + 2 * 3600_000;
    })
    .map((fx) => ({
      stage: fx.stage,
      status: fx.status,
      utc: fx.utcDate,
      home: fx.homeTeam?.tla ?? fx.homeTeam?.name ?? "?",
      away: fx.awayTeam?.tla ?? fx.awayTeam?.name ?? "?",
      ft: fx.score.fullTime,
      reg: fx.score.regularTime ?? null,
      duration: fx.score.duration ?? null,
      winner: fx.score.winner,
    }));

  return NextResponse.json({
    ok: true,
    appliedCount: report.applied.length,
    timeUpdates: report.timeUpdates,
    teamsSet: report.teamsSet,
    statusUpdates: report.statusUpdates,
    playersImported,
    applied: report.applied,
    unresolvedTeams: [...report.unresolved],
    unmatched: report.unmatched,
    deferred: report.deferred,
    feed: { stageCounts, recent },
  });
}
