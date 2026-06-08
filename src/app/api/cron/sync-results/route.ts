import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { scorePrediction } from "@/lib/scoring";
import type { Match, MatchStage, Prediction, Team } from "@/lib/types";

// Pulls finished FIFA World Cup 2026 results from API-Football, applies them to
// our matches, and re-scores every prediction — the same logic the admin panel
// uses (scorePrediction), so auto-applied results score identically.
//
// Trigger with the CRON_SECRET, e.g.:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/sync-results
// Vercel Cron and the GitHub Action both send that header automatically.

export const dynamic = "force-dynamic";

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE = 1; // API-Football league id for the World Cup
const SEASON = 2026;
const FINISHED = new Set(["FT", "AET", "PEN"]); // statuses that count as a final result

// ---- API-Football response shapes (only the fields we use) ----
interface ApiTeam {
  id: number;
  name: string;
  winner: boolean | null;
}
interface ApiGoals {
  home: number | null;
  away: number | null;
}
interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: ApiGoals;
  score: { fulltime: ApiGoals; extratime: ApiGoals | null; penalty: ApiGoals | null };
}
interface ApiResponse {
  response?: ApiFixture[];
  errors?: unknown;
}

interface SyncReport {
  applied: { id: number; teams: string; score: string }[];
  unchanged: number[];
  unresolvedTeams: string[];
  unmatchedFixtures: string[];
  notFinished: number;
}

function roundToStage(round: string): MatchStage | null {
  const r = round.toLowerCase();
  if (r.includes("group")) return "group";
  if (r.includes("round of 32")) return "r32";
  if (r.includes("round of 16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("3rd place") || r.includes("third")) return "third";
  if (r.includes("final")) return "final";
  return null;
}

// Normalize a team name for fuzzy matching: strip accents, lowercase, drop non-alphanumerics.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Known API-Football vs our-seed naming differences (normalized → normalized).
const NAME_ALIASES: Record<string, string> = {
  usa: "unitedstates",
  turkey: "turkiye",
  czechrepublic: "czechia",
  bosniaandherzegovina: "bosniaherzegovina",
  congodr: "drcongo",
  drcongo: "drcongo",
  koreasouth: "southkorea",
  iriran: "iran",
};

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (new URL(req.url).searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "API_FOOTBALL_KEY is not set" },
      { status: 500 }
    );
  }

  // 1. Fetch the full World Cup 2026 fixture list (with results).
  const res = await fetch(`${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE}&season=${SEASON}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `API-Football returned ${res.status}` },
      { status: 502 }
    );
  }
  const json = (await res.json()) as ApiResponse;
  const fixtures = json.response ?? [];

  // 2. Load our teams + matches.
  const admin = createAdminClient();
  const [{ data: teamsData }, { data: matchesData }] = await Promise.all([
    admin.from("teams").select("*"),
    admin.from("matches").select("*"),
  ]);
  const teams = (teamsData ?? []) as Team[];
  const matches = (matchesData ?? []) as Match[];

  // Resolver: normalized team name / code → our team id.
  const byKey = new Map<string, number>();
  for (const t of teams) {
    byKey.set(norm(t.name), t.id);
    if (t.code) byKey.set(norm(t.code), t.id);
  }
  const resolveTeam = (apiName: string): number | null => {
    const n = norm(apiName);
    if (byKey.has(n)) return byKey.get(n)!;
    const alias = NAME_ALIASES[n];
    if (alias && byKey.has(alias)) return byKey.get(alias)!;
    return null;
  };

  // Index our matches by stage + unordered team pair (a match has a unique pair per stage).
  const pairKey = (stage: string, a: number, b: number) =>
    `${stage}|${Math.min(a, b)}-${Math.max(a, b)}`;
  const matchByPair = new Map<string, Match>();
  for (const m of matches) {
    if (m.home_team_id && m.away_team_id) {
      matchByPair.set(pairKey(m.stage, m.home_team_id, m.away_team_id), m);
    }
  }

  const report: SyncReport = {
    applied: [],
    unchanged: [],
    unresolvedTeams: [],
    unmatchedFixtures: [],
    notFinished: 0,
  };

  for (const fx of fixtures) {
    if (!FINISHED.has(fx.fixture?.status?.short)) {
      report.notFinished++;
      continue;
    }
    const stage = roundToStage(fx.league?.round ?? "");
    const homeName = fx.teams?.home?.name ?? "";
    const awayName = fx.teams?.away?.name ?? "";
    const homeId = resolveTeam(homeName);
    const awayId = resolveTeam(awayName);

    if (!homeId) report.unresolvedTeams.push(homeName);
    if (!awayId) report.unresolvedTeams.push(awayName);
    if (!stage || !homeId || !awayId) continue;

    const ourMatch = matchByPair.get(pairKey(stage, homeId, awayId));
    if (!ourMatch) {
      report.unmatchedFixtures.push(`${homeName} v ${awayName} (${stage})`);
      continue;
    }

    // 90' score (fall back to final goals). API order is API-home/away.
    const apiHome = fx.score?.fulltime?.home ?? fx.goals?.home;
    const apiAway = fx.score?.fulltime?.away ?? fx.goals?.away;
    if (apiHome == null || apiAway == null) {
      report.unmatchedFixtures.push(`${homeName} v ${awayName} (no score)`);
      continue;
    }

    // Our match may store the teams in the opposite order — align to our home_team_id.
    const sameOrder = ourMatch.home_team_id === homeId;
    const ourHome = sameOrder ? apiHome : apiAway;
    const ourAway = sameOrder ? apiAway : apiHome;

    // Advancer (knockout only): API marks the winner team.
    let winnerTeamId: number | null = null;
    if (stage !== "group") {
      if (fx.teams.home.winner === true) winnerTeamId = homeId;
      else if (fx.teams.away.winner === true) winnerTeamId = awayId;
    }

    // Idempotent: skip if already final with identical score + advancer.
    if (
      ourMatch.status === "final" &&
      ourMatch.home_score === ourHome &&
      ourMatch.away_score === ourAway &&
      ourMatch.winner_team_id === winnerTeamId
    ) {
      report.unchanged.push(ourMatch.id);
      continue;
    }

    // Apply the result, then re-score every prediction for this match.
    const { data: updated, error: upErr } = await admin
      .from("matches")
      .update({
        home_score: ourHome,
        away_score: ourAway,
        winner_team_id: winnerTeamId,
        status: "final",
      })
      .eq("id", ourMatch.id)
      .select("*")
      .single();
    if (upErr || !updated) {
      report.unmatchedFixtures.push(`${homeName} v ${awayName} (update failed)`);
      continue;
    }

    const { data: preds } = await admin
      .from("predictions")
      .select("*")
      .eq("match_id", ourMatch.id);
    for (const p of (preds ?? []) as Prediction[]) {
      const pts = scorePrediction(p, updated as Match);
      await admin.from("predictions").update({ points_awarded: pts, scored: true }).eq("id", p.id);
    }

    report.applied.push({
      id: ourMatch.id,
      teams: `${homeName} v ${awayName}`,
      score: `${ourHome}–${ourAway}`,
    });
  }

  report.unresolvedTeams = [...new Set(report.unresolvedTeams)];

  return NextResponse.json({
    ok: true,
    appliedCount: report.applied.length,
    ...report,
  });
}
