-- Accuracy v2: every settled pick is two predictions — the winner/result and
-- the exact score — so the leaderboard view now also counts exact-score hits.
-- Accuracy in the UI becomes (correct_matches + correct_scores) / (2 × total).
-- Run in the Supabase SQL editor.

create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(m.pts, 0) + coalesce(g.pts, 0) + coalesce(t.pts, 0) + coalesce(pod.pts, 0) as total_points,
  coalesce(m.correct, 0) as correct_matches,
  coalesce(m.total, 0) as total_match_preds,
  coalesce(m.correct_scores, 0) as correct_scores
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
  select user_id, sum(points_awarded) as pts
  from public.group_predictions group by user_id
) g on g.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts
  from public.tournament_predictions group by user_id
) t on t.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts
  from public.podium_predictions group by user_id
) pod on pod.user_id = p.id;

alter view public.leaderboard set (security_invoker = on);
