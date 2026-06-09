-- ===========================================================
-- Security hardening (audit fixes) — run in Supabase after 0003.
-- ===========================================================

-- 1) Stop users from promoting themselves to admin. RLS lets a user update their
--    own profile row; this removes is_admin from that column-level privilege so
--    only the service role (admin scoring / SQL editor) can change it.
revoke update (is_admin) on public.profiles from authenticated, anon;

-- 2) Stop users from awarding themselves points. RLS lets users write their own
--    prediction rows; these revokes block the points_awarded / scored columns, so
--    only the service-role admin scoring can set them.
revoke insert (points_awarded, scored), update (points_awarded, scored)
  on public.predictions from authenticated, anon;
revoke insert (points_awarded, scored), update (points_awarded, scored)
  on public.group_predictions from authenticated, anon;
revoke insert (points_awarded, scored), update (points_awarded, scored)
  on public.tournament_predictions from authenticated, anon;

-- 3) Podium: route every write through a controlled function so the two-window
--    rule and the "revised" flag can't be forged by writing the table directly.
revoke insert, update, delete on public.podium_predictions from authenticated, anon;

create or replace function public.save_podium_pick(p_position smallint, p_team_id integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_first timestamptz;
  v_last_group timestamptz;
  v_r32 timestamptz;
  v_now timestamptz := now();
  v_window int;
  v_existing public.podium_predictions%rowtype;
  v_original integer;
  v_revised boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_position not in (1, 2, 3) then raise exception 'Invalid podium position'; end if;

  select min(kickoff_at) into v_first from public.matches;
  select max(kickoff_at) into v_last_group from public.matches where stage = 'group';
  select min(kickoff_at) into v_r32 from public.matches where stage = 'r32';

  -- Window 1: before the first kickoff. Window 2: after the last group game, before R32.
  if v_now < v_first then
    v_window := 1;
  elsif v_last_group is not null and v_now >= v_last_group and (v_r32 is null or v_now < v_r32) then
    v_window := 2;
  else
    raise exception 'Podium picks are locked right now';
  end if;

  select * into v_existing from public.podium_predictions
    where user_id = v_uid and position = p_position;

  if v_window = 1 then
    v_original := p_team_id;          -- window-1 pick becomes the "original"
    v_revised := false;
  else
    v_original := v_existing.original_team_id;            -- keep the window-1 pick
    v_revised := (p_team_id is distinct from v_existing.original_team_id);
  end if;

  insert into public.podium_predictions
    (user_id, position, team_id, original_team_id, revised, submitted_at, points_awarded, scored)
  values (v_uid, p_position, p_team_id, v_original, v_revised, now(), 0, false)
  on conflict (user_id, position) do update
    set team_id = excluded.team_id,
        original_team_id = excluded.original_team_id,
        revised = excluded.revised,
        submitted_at = now();
end $$;

grant execute on function public.save_podium_pick(smallint, integer) to authenticated;
