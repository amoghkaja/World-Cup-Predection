-- ===========================================================
-- 0007 — CRITICAL grants fix + avatar privacy. Run immediately.
--
-- Why: Postgres column-level REVOKE (migration 0004) is a no-op while the
-- role still holds Supabase's default table-level GRANT ALL. Verified live:
-- an ordinary signed-in user could PATCH profiles.is_admin = true (full
-- admin takeover) and could insert predictions with forged points_awarded.
-- The correct pattern is: revoke the table-level write privileges, then
-- grant back only the columns users may legitimately write. RLS still
-- restricts WHICH ROWS (own rows, before kickoff/lock); these grants
-- restrict WHICH COLUMNS. The service role bypasses both.
-- ===========================================================

-- ---------- avatar privacy preference ----------
alter table public.profiles
  add column if not exists hide_avatar boolean not null default false;

-- ---------- profiles: users may edit only name + avatar prefs ----------
revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, hide_avatar) on public.profiles to authenticated;

-- ---------- predictions: never points_awarded / scored ----------
revoke insert, update, delete on public.predictions from authenticated, anon;
grant insert (user_id, match_id, pred_home_score, pred_away_score, pred_outcome, submitted_at)
  on public.predictions to authenticated;
-- upsert (ON CONFLICT DO UPDATE) writes every payload column, so the key
-- columns must be update-grantable too; RLS pins user_id to auth.uid().
grant update (user_id, match_id, pred_home_score, pred_away_score, pred_outcome, submitted_at)
  on public.predictions to authenticated;

-- ---------- group_predictions ----------
revoke insert, update, delete on public.group_predictions from authenticated, anon;
grant insert (user_id, group_label, pred_winner_team_id, pred_runnerup_team_id, submitted_at)
  on public.group_predictions to authenticated;
grant update (user_id, group_label, pred_winner_team_id, pred_runnerup_team_id, submitted_at)
  on public.group_predictions to authenticated;

-- ---------- tournament_predictions ----------
-- delete stays granted: the save flow replaces (delete + insert) the user's
-- own row, and RLS already limits deletes to own rows before lock.
revoke insert, update on public.tournament_predictions from authenticated, anon;
grant insert (user_id, type, team_id, text_value, submitted_at)
  on public.tournament_predictions to authenticated;
grant update (user_id, type, team_id, text_value, submitted_at)
  on public.tournament_predictions to authenticated;
revoke delete on public.tournament_predictions from anon;

-- ---------- podium_predictions: RPC-only (re-assert) ----------
revoke insert, update, delete on public.podium_predictions from authenticated, anon;

-- ---------- reference tables: read-only for clients ----------
revoke insert, update, delete on public.teams, public.matches, public.players
  from authenticated, anon;

-- ---------- future tables: don't default to GRANT ALL for clients ----------
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;

-- ---------- leaderboard view: respect hide_avatar ----------
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  case when p.hide_avatar then null else p.avatar_url end as avatar_url,
  coalesce(m.pts, 0) + coalesce(g.pts, 0) + coalesce(t.pts, 0) + coalesce(pod.pts, 0) as total_points,
  coalesce(m.correct, 0) as correct_matches,
  coalesce(m.total, 0) as total_match_preds
from public.profiles p
left join (
  select user_id,
         sum(points_awarded) as pts,
         count(*) filter (where points_awarded > 0) as correct,
         count(*) filter (where scored) as total
  from public.predictions group by user_id
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
