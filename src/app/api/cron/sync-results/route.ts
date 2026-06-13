import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { TAG_LEADERBOARD, TAG_MATCHES, TAG_PLAYERS } from "@/lib/queries";
import { scorePrediction } from "@/lib/scoring";
import { settleMatchSideEffects, recomputeStreaksAndPerfectDays } from "@/lib/settle";
import type { Match, MatchStage, Prediction, Team } from "@/lib/types";

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
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
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

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "FOOTBALL_DATA_KEY is not set" }, { status: 500 });
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

  const admin = createAdminClient();
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

    const ft = fx.score.fullTime;
    const finished = FINISHED.has(fx.status) && ft.home != null && ft.away != null && teamsKnown;
    let needRescore = false;
    if (finished) {
      const ourHomeId = (updates.home_team_id as number | undefined) ?? our.home_team_id;
      const sameOrder = ourHomeId === homeId;
      const oh = sameOrder ? ft.home : ft.away;
      const oa = sameOrder ? ft.away : ft.home;
      const winnerId =
        our.stage === "group"
          ? null
          : fx.score.winner === "HOME_TEAM"
            ? homeId
            : fx.score.winner === "AWAY_TEAM"
              ? awayId
              : null;
      if (
        our.status !== "final" ||
        our.home_score !== oh ||
        our.away_score !== oa ||
        our.winner_team_id !== winnerId
      ) {
        updates.home_score = oh;
        updates.away_score = oa;
        updates.winner_team_id = winnerId;
        updates.status = "final";
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
      const { data: preds } = await admin.from("predictions").select("*").eq("match_id", our.id);
      const rows = (preds ?? []) as Prediction[];
      for (let i = 0; i < rows.length; i += 20) {
        await Promise.all(
          rows.slice(i, i + 20).map(async (p) => {
            const pts = scorePrediction(p, updated as Match);
            await admin
              .from("predictions")
              .update({ points_awarded: pts, scored: true })
              .eq("id", p.id);
          })
        );
      }
      // Side bets + joker for this match (after the main rescore above). The
      // global streak/perfect-day rebuild runs once at the end of the sync.
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
    // Rebuild streak + perfect-day bonuses once for the whole batch, then refresh.
    await recomputeStreaksAndPerfectDays(admin);
    revalidateTag(TAG_LEADERBOARD, "max");
  }
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
    feed: { stageCounts, recent },
  });
}
