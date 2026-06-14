-- ===========================================================
-- 0010 — Side bets, Joker/double-down, Streak & Perfect-matchday.
-- Run in the Supabase SQL editor (ideally inside a transaction).
--
-- Layers opt-in gambles + engagement bonuses on top of the existing
-- match-score predictions. Main picks are UNCHANGED. New point sources are
-- summed into the leaderboard view. Clients never write these tables directly:
-- side bets / joker go through SECURITY DEFINER RPCs; streak / perfect-day are
-- written only by the service role at settlement.
-- ===========================================================

-- ---------- enums ----------
do $$ begin
  create type side_bet_pick as enum ('yes','no');  -- both-teams-to-score
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
-- A single canonical "tournament day" so "one joker per calendar day" is the
-- same for every player regardless of their own timezone.
create or replace function public.tournament_day(ts timestamptz)
returns date
language sql stable
as $$ select (ts at time zone 'America/New_York')::date $$;

-- Authoritative activation cutoff. MUST match FEATURE_CUTOFF_ISO in src/lib/scoring.ts.
-- Mon 15 Jun 00:00 CEST.
create or replace function public.feature_cutoff()
returns timestamptz
language sql immutable
as $$ select timestamptz '2026-06-14 22:00:00+00' $$;

-- ---------- side_bets (both-teams-to-score) ----------
create table if not exists public.side_bets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  pick side_bet_pick not null,
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, match_id)          -- one side bet per match
);
create index if not exists side_bets_match_idx on public.side_bets (match_id);
create index if not exists side_bets_user_idx on public.side_bets (user_id);

-- ---------- joker_picks ----------
create table if not exists public.joker_picks (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  joker_day date not null,            -- tournament_day(match.kickoff_at)
  submitted_at timestamptz not null default now(),
  points_awarded integer not null default 0,
  scored boolean not null default false,
  unique (user_id, joker_day)         -- one joker per player per calendar day
);
create index if not exists joker_match_idx on public.joker_picks (match_id);

-- ---------- derived bonus tables (service-role written only) ----------
create table if not exists public.streak_bonuses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  streak_len integer not null,
  points_awarded integer not null default 0,
  primary key (user_id, match_id)
);

create table if not exists public.perfect_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  correct_picks integer not null,
  points_awarded integer not null default 0,
  primary key (user_id, day)
);

-- ---------- RLS ----------
alter table public.side_bets enable row level security;
drop policy if exists "read side bets" on public.side_bets;
create policy "read side bets" on public.side_bets for select using (
  user_id = auth.uid() or now() >= public.match_kickoff(match_id)
);

alter table public.joker_picks enable row level security;
drop policy if exists "read joker" on public.joker_picks;
create policy "read joker" on public.joker_picks for select using (
  user_id = auth.uid() or now() >= public.match_kickoff(match_id)
);

-- Derived bonuses are publicly readable: the leaderboard view is
-- security_invoker and read via the cookieless anon client, so read-own here
-- would zero everyone's streak/perfect points on the public board. They hold
-- only derived points, which the board exposes anyway.
alter table public.streak_bonuses enable row level security;
drop policy if exists "read streak" on public.streak_bonuses;
create policy "read streak" on public.streak_bonuses for select using (true);

alter table public.perfect_days enable row level security;
drop policy if exists "read perfect" on public.perfect_days;
create policy "read perfect" on public.perfect_days for select using (true);

-- ---------- grants ----------
-- Clients never write these directly. 0007 only revoked default privileges for
-- anon, so we must revoke from `authenticated` explicitly here.
revoke insert, update, delete on
  public.side_bets, public.joker_picks, public.streak_bonuses, public.perfect_days
  from authenticated, anon;

-- ---------- RPCs (enforce cutoff + deadline + validity, like save_podium_pick) ----------
create or replace function public.save_side_bet(p_match_id integer, p_pick side_bet_pick)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ko timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if now() < public.feature_cutoff() then raise exception 'Side bets are not live yet'; end if;
  select kickoff_at into v_ko from public.matches where id = p_match_id;
  if v_ko is null then raise exception 'No such match'; end if;
  if now() >= v_ko then raise exception 'This match is locked'; end if;

  insert into public.side_bets (user_id, match_id, pick, submitted_at, points_awarded, scored)
  values (v_uid, p_match_id, p_pick, now(), 0, false)
  on conflict (user_id, match_id) do update
    set pick = excluded.pick, submitted_at = now();
end $$;
grant execute on function public.save_side_bet(integer, side_bet_pick) to authenticated;

create or replace function public.save_joker(p_match_id integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ko timestamptz; v_day date;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if now() < public.feature_cutoff() then raise exception 'The joker is not live yet'; end if;
  select kickoff_at into v_ko from public.matches where id = p_match_id;
  if v_ko is null then raise exception 'No such match'; end if;
  if now() >= v_ko then raise exception 'This match is locked'; end if;
  if not exists (select 1 from public.predictions where user_id = v_uid and match_id = p_match_id) then
    raise exception 'Make your match pick before playing the joker';
  end if;
  v_day := public.tournament_day(v_ko);

  -- Moving the day's joker to a new match: allowed only while the EXISTING
  -- (joker_picks.*) match hasn't kicked off — you can't yank the joker off a
  -- match already underway to dodge its result. The NEW match is already
  -- verified open by the now() >= v_ko check above.
  insert into public.joker_picks (user_id, match_id, joker_day, submitted_at, points_awarded, scored)
  values (v_uid, p_match_id, v_day, now(), 0, false)
  on conflict (user_id, joker_day) do update
    set match_id = excluded.match_id, submitted_at = now()
    where now() < public.match_kickoff(joker_picks.match_id);
end $$;
grant execute on function public.save_joker(integer) to authenticated;

create or replace function public.clear_joker(p_match_id integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.joker_picks
   where user_id = v_uid and match_id = p_match_id
     and now() < public.match_kickoff(match_id);
end $$;
grant execute on function public.clear_joker(integer) to authenticated;

-- ---------- leaderboard view: add the four new point sources ----------
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.display_name,
  case when p.hide_avatar then null else p.avatar_url end as avatar_url,
  coalesce(m.pts, 0) + coalesce(g.pts, 0) + coalesce(t.pts, 0) + coalesce(pod.pts, 0)
    + coalesce(sb.pts, 0) + coalesce(j.pts, 0) + coalesce(sk.pts, 0) + coalesce(pd.pts, 0)
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
) sk on sk.user_id = p.id
left join (
  select user_id, sum(points_awarded) as pts from public.perfect_days group by user_id
) pd on pd.user_id = p.id;

alter view public.leaderboard set (security_invoker = on);
