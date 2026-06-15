-- ===========================================================
-- 0012 — Remove the perfect-matchday bonus; the streak ("5 in a row") replaces
-- it. Run in the Supabase SQL editor AFTER deploying the matching app code
-- (the app no longer reads or writes perfect_days).
--
-- The perfect-day bonus depended on grouping matches into a calendar day, which
-- is unfair across timezones (and let a cutoff-sliced partial day score as
-- "perfect"). The streak bonus is purely order-based, so the day concept is
-- gone from scoring entirely. tournament_day() stays — the joker still uses it
-- for its one-per-day allowance, which is consistent for everyone.
-- ===========================================================

-- Rebuild the leaderboard view WITHOUT the perfect_days source first, so the
-- table is no longer referenced when we drop it.
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

drop table if exists public.perfect_days;
