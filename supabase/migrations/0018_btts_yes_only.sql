-- ===========================================================
-- 0018 — Both-teams-to-score becomes a YES-only long-shot.
-- Run in the Supabase SQL editor (inside a transaction).
--
-- BTTS used to be a two-sided yes/no call, but that was farmable: World Cup
-- knockouts are low-scoring (BTTS lands ~40-45% of the time), so a blind "no"
-- at the symmetric price was positive EV. It's now one-sided, in line with the
-- ET/pens markets — you only ever back "yes". The server action already blocks a
-- "no" BTTS, but save_side_bet is a SECURITY DEFINER RPC granted to
-- `authenticated`, so we enforce it here too (the DB is the source of truth; a
-- direct RPC call must not be able to dodge the action's check).
--
-- Non-retroactive: existing group-stage BTTS "no" rows keep their settled
-- scores. This only blocks NEW "no" bets; the group stage is over anyway.
-- ===========================================================

create or replace function public.save_side_bet(
  p_match_id integer, p_market side_bet_market, p_pick side_bet_pick
)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ko timestamptz; v_stage match_stage;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if now() < public.feature_cutoff() then raise exception 'Side bets are not live yet'; end if;
  select kickoff_at, stage into v_ko, v_stage from public.matches where id = p_match_id;
  if v_ko is null then raise exception 'No such match'; end if;
  if now() >= v_ko then raise exception 'This match is locked'; end if;
  -- ET/pens markets only exist in knockouts; BTTS is allowed on any match.
  if p_market in ('et','pens') and v_stage = 'group' then
    raise exception 'That bet is knockouts only';
  end if;
  -- BTTS is yes-only — there's no "no" side to farm.
  if p_market = 'btts' and p_pick = 'no' then
    raise exception 'Both teams to score is a yes-only bet';
  end if;

  insert into public.side_bets (user_id, match_id, market, pick, submitted_at, points_awarded, scored)
  values (v_uid, p_match_id, p_market, p_pick, now(), 0, false)
  on conflict (user_id, match_id, market) do update
    set pick = excluded.pick, submitted_at = now();
end $$;
grant execute on function public.save_side_bet(integer, side_bet_market, side_bet_pick) to authenticated;
