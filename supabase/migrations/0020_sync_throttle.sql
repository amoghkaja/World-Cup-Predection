-- ===========================================================
-- 0020 — Global throttle for the self-healing results sync.
-- Run in the Supabase SQL editor.
--
-- maybeKickResultsSync throttles per warm serverless instance (module state),
-- so a traffic spike during a match can have MANY instances each fire the sync
-- inside the same window — against football-data's 10 req/min budget, right
-- when results are due. This single-row table lets the sync route claim the
-- run atomically (UPDATE ... WHERE last_run_at is old enough RETURNING), so
-- exactly one auto-triggered sync runs per window across ALL instances.
--
-- Scheduled-cron and admin-triggered syncs bypass the claim (they must always
-- run) but still stamp the row, so an auto kick right after a cron run is
-- suppressed too. Service-role only: RLS on with no policies, writes revoked.
-- ===========================================================

create table if not exists public.sync_throttle (
  id smallint primary key check (id = 1),
  last_run_at timestamptz not null default '-infinity'
);
insert into public.sync_throttle (id) values (1) on conflict (id) do nothing;

alter table public.sync_throttle enable row level security;
revoke all on public.sync_throttle from authenticated, anon;
