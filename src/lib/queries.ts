import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  GroupPrediction,
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
