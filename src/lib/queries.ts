import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  GroupPrediction,
  LeaderboardRow,
  MatchWithTeams,
  PodiumPrediction,
  Prediction,
  Profile,
  Team,
  TournamentPrediction,
} from "@/lib/types";

export type PodiumWindows = {
  firstKickoff: string | null;
  lastGroupKickoff: string | null;
  firstR32Kickoff: string | null;
};

// matches has 3 FKs to teams (home/away/winner) — disambiguate the embed by FK column.
const MATCH_SELECT =
  "*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)";

// auth.getUser() is a network round-trip to Supabase Auth. A single page renders
// the layout + several data queries, each of which needs the user — so we cache()
// it to do exactly one validation per request instead of 5+.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

/**
 * Leaderboard sorted by points, then correct results, then name — and ranked
 * with ties sharing a rank (1, 1, 3 …), so equal points means equal rank.
 */
export const getLeaderboard = cache(async (): Promise<RankedLeaderboardRow[]> => {
  const supabase = await createClient();
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
});

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").order("id");
  return (data ?? []) as Team[];
}

export async function getPlayers(): Promise<{ name: string; nationality: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("players").select("name, nationality").order("name");
  return (data ?? []) as { name: string; nationality: string | null }[];
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
  const [{ data: podium }, { data: groups }, { data: tour }, { count: playerCount }] =
    await Promise.all([
      supabase.from("podium_predictions").select("position, team_id").eq("user_id", user.id),
      supabase
        .from("group_predictions")
        .select("pred_winner_team_id, pred_runnerup_team_id")
        .eq("user_id", user.id),
      supabase.from("tournament_predictions").select("type, text_value").eq("user_id", user.id),
      supabase.from("players").select("id", { count: "exact", head: true }),
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
  const goldenRequired = (playerCount ?? 0) > 0;
  const complete = championSet && groupsDone >= 12 && (!goldenRequired || goldenSet);
  return { championSet, groupsDone, goldenSet, goldenRequired, complete };
});

export async function getMatches(stage?: string): Promise<MatchWithTeams[]> {
  const supabase = await createClient();
  let q = supabase.from("matches").select(MATCH_SELECT).order("kickoff_at");
  if (stage) q = q.eq("stage", stage);
  const { data } = await q;
  return (data ?? []) as unknown as MatchWithTeams[];
}

export async function getMatch(id: number): Promise<MatchWithTeams | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select(MATCH_SELECT).eq("id", id).single();
  return (data as unknown as MatchWithTeams) ?? null;
}

export async function getMyPredictions(): Promise<Map<number, Prediction>> {
  const user = await getCurrentUser();
  const map = new Map<number, Prediction>();
  if (!user) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("predictions").select("*").eq("user_id", user.id);
  (data ?? []).forEach((p) => map.set((p as Prediction).match_id, p as Prediction));
  return map;
}

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

export async function tournamentLockAt(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("kickoff_at")
    .order("kickoff_at")
    .limit(1)
    .single();
  return data?.kickoff_at ?? null;
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

/** Boundary times for the two podium windows: first kickoff, last group kickoff, first R32 kickoff. */
export async function podiumWindows(): Promise<PodiumWindows> {
  const supabase = await createClient();
  const [{ data: first }, { data: lastGroup }, { data: r32 }] = await Promise.all([
    supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
    supabase
      .from("matches")
      .select("kickoff_at")
      .eq("stage", "group")
      .order("kickoff_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("kickoff_at")
      .eq("stage", "r32")
      .order("kickoff_at")
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    firstKickoff: first?.kickoff_at ?? null,
    lastGroupKickoff: lastGroup?.kickoff_at ?? null,
    firstR32Kickoff: r32?.kickoff_at ?? null,
  };
}
