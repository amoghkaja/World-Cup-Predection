export type MatchStage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
export type MatchStatus = "scheduled" | "live" | "final";
export type PredOutcome = "home" | "away" | "draw";
export type TournamentPredType = "champion" | "finalist" | "golden_boot";

export interface Team {
  id: number;
  name: string;
  code: string;
  group_label: string | null;
  flag_emoji: string | null;
}

export interface Match {
  id: number;
  stage: MatchStage;
  group_label: string | null;
  label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: number | null;
  status: MatchStatus;
}

export interface MatchWithTeams extends Match {
  home_team: Team | null;
  away_team: Team | null;
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: number;
  pred_home_score: number;
  pred_away_score: number;
  pred_outcome: PredOutcome;
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export interface GroupPrediction {
  id: number;
  user_id: string;
  group_label: string;
  pred_winner_team_id: number | null;
  pred_runnerup_team_id: number | null;
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export interface TournamentPrediction {
  id: number;
  user_id: string;
  type: TournamentPredType;
  team_id: number | null;
  text_value: string | null;
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export type PodiumPosition = 1 | 2 | 3;

export interface PodiumPrediction {
  id: number;
  user_id: string;
  position: PodiumPosition;
  team_id: number | null;
  original_team_id: number | null; // the pick as of the pre-group window (for the early/late value)
  revised: boolean;
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export interface SideBet {
  id: number;
  user_id: string;
  match_id: number;
  pick: "yes" | "no"; // both-teams-to-score
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export interface JokerPick {
  id: number;
  user_id: string;
  match_id: number;
  joker_day: string;
  submitted_at: string;
  points_awarded: number;
  scored: boolean;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  hide_avatar: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  correct_matches: number;
  total_match_preds: number;
  correct_scores?: number | null; // exact-score hits; absent until migration 0009 runs
  side_bet_points?: number | null; // BTTS side-bet points; absent until migration 0013 runs
  joker_points?: number | null; // joker double-down points; absent until migration 0013 runs
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "Third place",
  final: "Final",
};
