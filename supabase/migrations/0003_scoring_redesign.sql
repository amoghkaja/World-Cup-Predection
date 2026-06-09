-- Scoring redesign: podium (top-3) predictions + leaderboard rollup.
-- Run in the Supabase SQL editor after 0001/0002.

-- ---------- podium_predictions ----------
create table if not exists public.podium_predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position smallint not null check (position in (1, 2, 3)),  -- 1=champion, 2=runner-up, 3=third
  team_id integer references public.teams(id),
  original_team_id integer references public.teams(id),      -- pick as of the pre-group window
  revised boolean not null default false,
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, position)
);
create index if not exists podium_user_idx on public.podium_predictions (user_id);

-- helper: have the knockouts started? (hard lock for podium writes)
create or replace function public.knockouts_locked()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(now() >= (select min(kickoff_at) from public.matches where stage = 'r32'), false) $$;

alter table public.podium_predictions enable row level security;

drop policy if exists "read podium" on public.podium_predictions;
create policy "read podium" on public.podium_predictions for select using (
  user_id = auth.uid() or public.knockouts_locked()
);

-- Hard backstop: writes only before the knockouts begin. The two-window rule
-- (pre-group sets the "original"; post-group revisions cost value) is enforced
-- in the savePodiumPick server action.
drop policy if exists "write podium before knockouts" on public.podium_predictions;
create policy "write podium before knockouts" on public.podium_predictions for all
  using (user_id = auth.uid() and not public.knockouts_locked())
  with check (user_id = auth.uid() and not public.knockouts_locked());

-- ---------- leaderboard view: include podium points ----------
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
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
