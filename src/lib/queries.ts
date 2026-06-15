import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type {
  GroupPrediction,
  JokerPick,
  LeaderboardRow,
  MatchWithTeams,
  PodiumPrediction,
  Prediction,
  Profile,
  SideBet,
  Team,
  TournamentPrediction,
} from "@/lib/types";
import { featuresActiveFor } from "@/lib/scoring";

export type PodiumWindows = {
  firstKickoff: string | null;
  lastGroupKickoff: string | null;
  firstR32Kickoff: string | null;
};

// Cache tags — bumped by the admin actions / results sync when data changes,
// so cached pages refresh immediately after a result lands.
export const TAG_MATCHES = "matches";
export const TAG_TEAMS = "teams";
export const TAG_PLAYERS = "players";
export const TAG_LEADERBOARD = "leaderboard";

// matches has 3 FKs to teams (home/away/winner) — disambiguate the embed by FK column.
const MATCH_SELECT =
  "*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)";

/**
 * Identify the signed-in user from their JWT, verified locally (JWKS) instead of
 * a per-request network round-trip to Supabase Auth. Postgres re-verifies the
 * same token on every query, so this is purely an identity read. Cached per
 * request — one verification serves the layout and every page query.
 */
export const getCurrentUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub };
});

/** The signed-in user's profile row. Cached per request (layout + page share it). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
});

/* ------------------------------------------------------------------ */
/* Tournament-wide data: identical for every user, served from the     */
/* data cache and invalidated by tag when results/teams change.        */
/* ------------------------------------------------------------------ */

const fetchAllMatches = unstable_cache(
  async (): Promise<MatchWithTeams[]> => {
    const supabase = createStaticClient();
    const { data } = await supabase.from("matches").select(MATCH_SELECT).order("kickoff_at");
    return (data ?? []) as unknown as MatchWithTeams[];
  },
  ["all-matches"],
  { tags: [TAG_MATCHES], revalidate: 300 }
);

export const getMatches = cache(async (stage?: string): Promise<MatchWithTeams[]> => {
  const all = await fetchAllMatches();
  return stage ? all.filter((m) => m.stage === stage) : all;
});

export async function getMatch(id: number): Promise<MatchWithTeams | null> {
  const all = await fetchAllMatches();
  return all.find((m) => m.id === id) ?? null;
}

export const getTeams = unstable_cache(
  async (): Promise<Team[]> => {
    const supabase = createStaticClient();
    const { data } = await supabase.from("teams").select("*").order("id");
    return (data ?? []) as Team[];
  },
  ["all-teams"],
  { tags: [TAG_TEAMS], revalidate: 3600 }
);

export const getPlayers = unstable_cache(
  async (): Promise<{ name: string; nationality: string | null }[]> => {
    const supabase = createStaticClient();
    const { data } = await supabase.from("players").select("name, nationality").order("name");
    return (data ?? []) as { name: string; nationality: string | null }[];
  },
  ["all-players"],
  { tags: [TAG_PLAYERS], revalidate: 3600 }
);

export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

/**
 * Leaderboard sorted by points, then correct results, then name — ties share a
 * rank (1, 1, 3 …). Identical for everyone, so it's cached and tag-invalidated
 * whenever scoring runs.
 */
export const getLeaderboard = unstable_cache(
  async (): Promise<RankedLeaderboardRow[]> => {
    const supabase = createStaticClient();
    const { data } = await supabase.from("leaderboard").select("*");
    const rows = ((data ?? []) as LeaderboardRow[]).sort(
      (a, b) =>
        b.total_points - a.total_points ||
        b.correct_matches - a.correct_matches ||
        (a.display_name ?? "").localeCompare(b.display_name ?? "")
    );
    let prevPts = NaN;
    let prevRank = 0;
    return rows.map((r, i) => {
      const rank = r.total_points === prevPts ? prevRank : i + 1;
      prevPts = r.total_points;
      prevRank = rank;
      return { ...r, rank };
    });
  },
  ["leaderboard"],
  { tags: [TAG_LEADERBOARD], revalidate: 60 }
);

/** First kickoff of the tournament = the pre-tournament picks lock. */
export async function tournamentLockAt(): Promise<string | null> {
  const all = await getMatches(); // already ordered by kickoff
  return all[0]?.kickoff_at ?? null;
}

/** Boundary times for the two podium windows: first kickoff, last group kickoff, first R32 kickoff. */
export async function podiumWindows(): Promise<PodiumWindows> {
  const all = await getMatches();
  let lastGroup: string | null = null;
  let firstR32: string | null = null;
  for (const m of all) {
    if (m.stage === "group" && (lastGroup === null || m.kickoff_at > lastGroup)) {
      lastGroup = m.kickoff_at;
    }
    if (m.stage === "r32" && (firstR32 === null || m.kickoff_at < firstR32)) {
      firstR32 = m.kickoff_at;
    }
  }
  return {
    firstKickoff: all[0]?.kickoff_at ?? null,
    lastGroupKickoff: lastGroup,
    firstR32Kickoff: firstR32,
  };
}

/* ------------------------------------------------------------------ */
/* Per-user data: always fresh, request-scoped.                        */
/* ------------------------------------------------------------------ */

export const getMyPredictions = cache(async (): Promise<Map<number, Prediction>> => {
  const user = await getCurrentUser();
  const map = new Map<number, Prediction>();
  if (!user) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("predictions").select("*").eq("user_id", user.id);
  (data ?? []).forEach((p) => map.set((p as Prediction).match_id, p as Prediction));
  return map;
});

// Per-user side bets, keyed by match id (one BTTS bet per match). Request-scoped
// cache only — never unstable_cache (would leak one player's bets to another).
export const getMySideBets = cache(async (): Promise<Map<number, SideBet>> => {
  const user = await getCurrentUser();
  const map = new Map<number, SideBet>();
  if (!user) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("side_bets").select("*").eq("user_id", user.id);
  (data ?? []).forEach((b) => map.set((b as SideBet).match_id, b as SideBet));
  return map;
});

// Per-user jokers, keyed by match id; plus the set of canonical days already used.
export const getMyJokers = cache(
  async (): Promise<{ byMatch: Map<number, JokerPick>; days: Set<string> }> => {
    const user = await getCurrentUser();
    const byMatch = new Map<number, JokerPick>();
    const days = new Set<string>();
    if (!user) return { byMatch, days };
    const supabase = await createClient();
    const { data } = await supabase.from("joker_picks").select("*").eq("user_id", user.id);
    (data ?? []).forEach((j) => {
      byMatch.set((j as JokerPick).match_id, j as JokerPick);
      days.add((j as JokerPick).joker_day);
    });
    return { byMatch, days };
  }
);

/**
 * Current streak for the badge. The run is "alive" only if the user extended it
 * on the MOST RECENT settled eligible match — a miss or a skip writes no
 * streak_bonuses row for that match, so the streak is 0 even though earlier
 * (banked) bonus rows still exist.
 */
export const getMyStreak = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;

  const all = await getMatches(); // ordered by kickoff
  const latestSettled = [...all]
    .reverse()
    .find(
      (m) =>
        m.status === "final" &&
        m.home_score != null &&
        featuresActiveFor(m.kickoff_at)
    );
  if (!latestSettled) return 0;

  const supabase = await createClient();
  const { data } = await supabase
    .from("streak_bonuses")
    .select("streak_len")
    .eq("user_id", user.id)
    .eq("match_id", latestSettled.id)
    .maybeSingle();
  return (data as { streak_len: number } | null)?.streak_len ?? 0;
});

export async function getMyGroupPredictions(): Promise<Map<string, GroupPrediction>> {
  const user = await getCurrentUser();
  const map = new Map<string, GroupPrediction>();
  if (!user) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("group_predictions").select("*").eq("user_id", user.id);
  (data ?? []).forEach((g) => map.set((g as GroupPrediction).group_label, g as GroupPrediction));
  return map;
}

export async function getMyTournamentPredictions(): Promise<TournamentPrediction[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_predictions")
    .select("*")
    .eq("user_id", user.id);
  return (data ?? []) as TournamentPrediction[];
}

export async function getMyPodiumPredictions(): Promise<PodiumPrediction[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("podium_predictions")
    .select("*")
    .eq("user_id", user.id)
    .order("position");
  return (data ?? []) as PodiumPrediction[];
}

/**
 * Whether a player has completed the required pre-tournament picks (champion, all
 * 12 group top-twos, and Golden Boot). Golden Boot is only required once the player
 * list is loaded. Cached per request — match-picking surfaces gate on `complete`.
 */
export const getSetupStatus = cache(async () => {
  const user = await getCurrentUser();
  const empty = {
    championSet: false,
    groupsDone: 0,
    goldenSet: false,
    goldenRequired: false,
    complete: false,
  };
  if (!user) return empty;
  const supabase = await createClient();
  const [{ data: podium }, { data: groups }, { data: tour }, players] = await Promise.all([
    supabase.from("podium_predictions").select("position, team_id").eq("user_id", user.id),
    supabase
      .from("group_predictions")
      .select("pred_winner_team_id, pred_runnerup_team_id")
      .eq("user_id", user.id),
    supabase.from("tournament_predictions").select("type, text_value").eq("user_id", user.id),
    getPlayers(), // cached — replaces a per-request count query
  ]);
  const podiumRows = (podium ?? []) as { position: number; team_id: number | null }[];
  const groupRows = (groups ?? []) as {
    pred_winner_team_id: number | null;
    pred_runnerup_team_id: number | null;
  }[];
  const tourRows = (tour ?? []) as { type: string; text_value: string | null }[];
  const championSet = podiumRows.some((p) => p.position === 1 && p.team_id != null);
  const groupsDone = groupRows.filter(
    (g) => g.pred_winner_team_id != null && g.pred_runnerup_team_id != null
  ).length;
  const goldenSet = tourRows.some((p) => p.type === "golden_boot" && !!p.text_value);
  const goldenRequired = players.length > 0;
  const complete = championSet && groupsDone >= 12 && (!goldenRequired || goldenSet);
  return { championSet, groupsDone, goldenSet, goldenRequired, complete };
});
