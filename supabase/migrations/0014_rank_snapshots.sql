-- ===========================================================
-- 0014 — daily rank snapshots, for leaderboard "movement" arrows (↑/↓ today).
-- One row per user holding their rank as of the first sync of the current
-- tournament day; the UI compares it to the live rank to show movement.
-- Service-role written only (by the results sync); publicly readable so the
-- cookieless leaderboard read can include it.
-- ===========================================================

create table if not exists public.rank_snapshots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rank integer not null,
  captured_at timestamptz not null default now()
);

alter table public.rank_snapshots enable row level security;

drop policy if exists "read rank snapshots" on public.rank_snapshots;
create policy "read rank snapshots" on public.rank_snapshots for select using (true);

revoke insert, update, delete on public.rank_snapshots from authenticated, anon;
