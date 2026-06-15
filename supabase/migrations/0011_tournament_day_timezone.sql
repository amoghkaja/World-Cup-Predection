-- ===========================================================
-- 0011 — Fix the canonical "tournament day" timezone.
-- Run in the Supabase SQL editor.
--
-- 0010 defined tournament_day() in America/New_York, but the league runs on
-- CEST (the feature cutoff is midnight CEST). With a NY day boundary, late-
-- evening European matches fell into the PREVIOUS calendar day, and the cutoff
-- sliced 14 Jun in half — so a 2-match fragment of that day was scored as a
-- "perfect day". Europe/Berlin aligns the day boundary with the cutoff midnight,
-- so no day is ever split again.
--
-- MUST match TOURNAMENT_DAY_TZ in src/lib/scoring.ts.
--
-- After running this, re-run the admin "Recompute feature scoring" action (or
-- recomputeFeatureScoring) so the stale streak_bonuses / perfect_days rows are
-- rebuilt against the corrected day. joker_day values already stored keep their
-- old date but are harmless (no joker has been scored yet).
-- ===========================================================

create or replace function public.tournament_day(ts timestamptz)
returns date
language sql stable
as $$ select (ts at time zone 'Europe/Berlin')::date $$;
