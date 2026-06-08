-- World Cup Pick'em — schema
-- Run in Supabase SQL editor (or via `supabase db push`).

-- ---------- Enums ----------
do $$ begin
  create type match_stage as enum ('group','r32','r16','qf','sf','third','final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('scheduled','live','final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pred_outcome as enum ('home','away','draw');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tournament_pred_type as enum ('champion','finalist','golden_boot');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- teams ----------
create table if not exists public.teams (
  id integer primary key,
  name text not null,
  code text not null,
  group_label text,        -- 'A'..'L', null for placeholder/unknown
  flag_emoji text
);

-- ---------- matches ----------
create table if not exists public.matches (
  id integer primary key,
  stage match_stage not null,
  group_label text,                 -- 'A'..'L' for group stage, null otherwise
  label text,                       -- human label e.g. 'R32 Match 1'
  home_team_id integer references public.teams(id),
  away_team_id integer references public.teams(id),
  home_placeholder text,            -- e.g. 'Winner Group A' before bracket fills
  away_placeholder text,
  kickoff_at timestamptz not null,
  home_score integer,
  away_score integer,
  winner_team_id integer references public.teams(id),  -- null score+final = draw
  status match_status not null default 'scheduled'
);

create index if not exists matches_kickoff_idx on public.matches (kickoff_at);
create index if not exists matches_stage_idx on public.matches (stage);

-- ---------- predictions (per match) ----------
create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  pred_home_score integer not null,
  pred_away_score integer not null,
  pred_outcome pred_outcome not null,
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, match_id)
);
create index if not exists predictions_user_idx on public.predictions (user_id);
create index if not exists predictions_match_idx on public.predictions (match_id);

-- ---------- group qualifier predictions ----------
create table if not exists public.group_predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_label text not null,
  pred_winner_team_id integer references public.teams(id),
  pred_runnerup_team_id integer references public.teams(id),
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, group_label)
);

-- ---------- tournament-wide predictions ----------
create table if not exists public.tournament_predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type tournament_pred_type not null,
  team_id integer references public.teams(id),
  text_value text,                  -- for golden_boot player name
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, type, team_id)
);

-- ---------- leaderboard view ----------
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(m.pts, 0) + coalesce(g.pts, 0) + coalesce(t.pts, 0) as total_points,
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
) t on t.user_id = p.id;
