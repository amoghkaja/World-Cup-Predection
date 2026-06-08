import { createClient } from "@/lib/supabase/server";
import type {
  GroupPrediction,
  MatchWithTeams,
  Prediction,
  Profile,
  Team,
  TournamentPrediction,
} from "@/lib/types";

// matches has 3 FKs to teams (home/away/winner) — disambiguate the embed by FK column.
const MATCH_SELECT =
  "*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").order("id");
  return (data ?? []) as Team[];
}

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const map = new Map<number, Prediction>();
  if (!user) return map;
  const { data } = await supabase.from("predictions").select("*").eq("user_id", user.id);
  (data ?? []).forEach((p) => map.set((p as Prediction).match_id, p as Prediction));
  return map;
}

export async function getMyGroupPredictions(): Promise<Map<string, GroupPrediction>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const map = new Map<string, GroupPrediction>();
  if (!user) return map;
  const { data } = await supabase.from("group_predictions").select("*").eq("user_id", user.id);
  (data ?? []).forEach((g) => map.set((g as GroupPrediction).group_label, g as GroupPrediction));
  return map;
}

export async function getMyTournamentPredictions(): Promise<TournamentPrediction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
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
