-- ===========================================================
-- 0008 — one tournament pick per (user, type).
--
-- The original constraint was unique (user_id, type, team_id), which still
-- allows several rows of the same type with different teams (and any number
-- of NULL-team golden-boot rows). The save flow deletes-then-inserts, so a
-- retry/race could leave duplicates that would each earn points. Enforce the
-- real rule at the database level and let the app upsert on (user_id, type).
-- ===========================================================

-- Drop duplicates first (keep the most recent pick of each type).
delete from public.tournament_predictions t
using public.tournament_predictions newer
where newer.user_id = t.user_id
  and newer.type = t.type
  and (newer.submitted_at > t.submitted_at
       or (newer.submitted_at = t.submitted_at and newer.id > t.id));

alter table public.tournament_predictions
  drop constraint if exists tournament_predictions_user_id_type_team_id_key;

alter table public.tournament_predictions
  add constraint tournament_predictions_user_type_key unique (user_id, type);
