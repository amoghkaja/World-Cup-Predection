-- ===========================================================
-- 0016 — Knockout result detail: how a tie was settled, so the UI can show
-- "a.e.t." / "won 4-2 on pens" and the ET/pens side bets (0017) settle from
-- stored fields. home_score/away_score now authoritatively hold the 90-MINUTE
-- (regularTime) score; these columns describe everything beyond 90 minutes.
--
-- All nullable → group rows and not-yet-final rows are untouched (group games
-- keep decided_in = null, and the feed's regularTime == fullTime for REGULAR
-- matches, so stored scores don't change). Run in the Supabase SQL editor.
-- ===========================================================

do $$ begin
  create type match_decided_in as enum ('regular','extra_time','penalties');
exception when duplicate_object then null; end $$;

alter table public.matches
  add column if not exists decided_in match_decided_in,  -- null for group / not-yet-final
  add column if not exists et_home  integer,             -- score after extra time (full 120')
  add column if not exists et_away  integer,
  add column if not exists pens_home integer,            -- shootout score
  add column if not exists pens_away integer;

-- No RLS/grant changes needed: `matches` is already publicly readable and
-- written only by admin / the service-role results sync; the leaderboard view
-- does not reference these columns.
