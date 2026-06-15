-- ===========================================================
-- 0013 — Expose the gamble point components on the leaderboard view so the app
-- can render a view-only "no side bets / no joker" board. Purely additive: two
-- new columns, no change to total_points or any stored score. Run in the
-- Supabase SQL editor.
-- ===========================================================

create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  case when p.hide_avatar then null else p.avatar_url end as avatar_url,
  coalesce(m.pts, 0) + coalesce(g.pts, 0) + coalesce(t.pts, 0) + coalesce(pod.pts, 0)
    + coalesce(sb.pts, 0) + coalesce(j.pts, 0) + coalesce(sk.pts, 0)
    as total_points,
  coalesce(m.correct, 0) as correct_matches,
  coalesce(m.total, 0) as total_match_preds,
  coalesce(m.correct_scores, 0) as correct_scores,
  coalesce(sb.pts, 0) as side_bet_points,
  coalesce(j.pts, 0) as joker_points
from public.profiles p
left join (
  select pr.user_id,
         sum(pr.points_awarded) as pts,
         count(*) filter (where pr.points_awarded > 0) as correct,
         count(*) filter (where pr.scored) as total,
         count(*) filter (
           where pr.scored
             and pr.pred_home_score = ma.home_score
             and pr.pred_away_score = ma.away_score
         ) as correct_scores
  from public.predictions pr
  join public.matches ma on ma.id = pr.match_id
  group by pr.user_id
) m on m.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.group_predictions group by user_id
) g on g.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.tournament_predictions group by user_id
) t on t.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.podium_predictions group by user_id
) pod on pod.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.side_bets where scored group by user_id
) sb on sb.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.joker_picks where scored group by user_id
) j on j.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.streak_bonuses group by user_id
) sk on sk.user_id = p.id;

alter view public.leaderboard set (security_invoker = on);
