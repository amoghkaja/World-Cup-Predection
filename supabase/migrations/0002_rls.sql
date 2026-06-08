-- World Cup Pick'em — Row Level Security
-- Enforces: users only write their own predictions, and only before kickoff.

-- helper: is the signed-in user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- helper: kickoff time of a match
create or replace function public.match_kickoff(mid integer)
returns timestamptz
language sql stable security definer set search_path = public
as $$ select kickoff_at from public.matches where id = mid $$;

-- helper: have predictions locked tournament-wide (first kickoff passed)?
create or replace function public.tournament_locked()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(now() >= (select min(kickoff_at) from public.matches), false) $$;

-- Make views respect the querying user's RLS.
alter view public.leaderboard set (security_invoker = on);

-- ---------- profiles ----------
alter table public.profiles enable row level security;

drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all" on public.profiles
  for select using (true);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- teams ----------
alter table public.teams enable row level security;
drop policy if exists "teams readable by all" on public.teams;
create policy "teams readable by all" on public.teams for select using (true);
drop policy if exists "admin writes teams" on public.teams;
create policy "admin writes teams" on public.teams for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- matches ----------
alter table public.matches enable row level security;
drop policy if exists "matches readable by all" on public.matches;
create policy "matches readable by all" on public.matches for select using (true);
drop policy if exists "admin writes matches" on public.matches;
create policy "admin writes matches" on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- predictions ----------
alter table public.predictions enable row level security;

-- Read: your own anytime; others' only after that match kicks off (fairness).
drop policy if exists "read predictions" on public.predictions;
create policy "read predictions" on public.predictions for select using (
  user_id = auth.uid() or now() >= public.match_kickoff(match_id)
);

drop policy if exists "insert own prediction before kickoff" on public.predictions;
create policy "insert own prediction before kickoff" on public.predictions for insert
  with check (user_id = auth.uid() and now() < public.match_kickoff(match_id));

drop policy if exists "update own prediction before kickoff" on public.predictions;
create policy "update own prediction before kickoff" on public.predictions for update
  using (user_id = auth.uid() and now() < public.match_kickoff(match_id))
  with check (user_id = auth.uid() and now() < public.match_kickoff(match_id));

-- ---------- group_predictions ----------
alter table public.group_predictions enable row level security;
drop policy if exists "read group preds" on public.group_predictions;
create policy "read group preds" on public.group_predictions for select using (
  user_id = auth.uid() or public.tournament_locked()
);
drop policy if exists "write group preds before lock" on public.group_predictions;
create policy "write group preds before lock" on public.group_predictions for all
  using (user_id = auth.uid() and not public.tournament_locked())
  with check (user_id = auth.uid() and not public.tournament_locked());

-- ---------- tournament_predictions ----------
alter table public.tournament_predictions enable row level security;
drop policy if exists "read tourn preds" on public.tournament_predictions;
create policy "read tourn preds" on public.tournament_predictions for select using (
  user_id = auth.uid() or public.tournament_locked()
);
drop policy if exists "write tourn preds before lock" on public.tournament_predictions;
create policy "write tourn preds before lock" on public.tournament_predictions for all
  using (user_id = auth.uid() and not public.tournament_locked())
  with check (user_id = auth.uid() and not public.tournament_locked());
