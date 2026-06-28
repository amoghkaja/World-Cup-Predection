-- ===========================================================
-- 0019 — BTTS goes back to a two-sided Yes/No call, and the knockout
-- extra-time / penalties markets become MUTUALLY EXCLUSIVE.
-- Run in the Supabase SQL editor (inside a transaction).
--
-- Reverts the 0018 "BTTS is yes-only" guard (players want both a Yes and a No
-- option again), and makes save_side_bet enforce that ET and penalties can't
-- both be backed on the same tie: a shootout is also extra time, so you pick at
-- most one. Backing one deletes the other. The server action mirrors this, but
-- the RPC is the source of truth (a direct call must not be able to hold both).
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

  insert into public.side_bets (user_id, match_id, market, pick, submitted_at, points_awarded, scored)
  values (v_uid, p_match_id, p_market, p_pick, now(), 0, false)
  on conflict (user_id, match_id, market) do update
    set pick = excluded.pick, submitted_at = now();

  -- ET and penalties are mutually exclusive — backing one drops the other.
  if p_market = 'et' then
    delete from public.side_bets where user_id = v_uid and match_id = p_match_id and market = 'pens';
  elsif p_market = 'pens' then
    delete from public.side_bets where user_id = v_uid and match_id = p_match_id and market = 'et';
  end if;
end $$;
grant execute on function public.save_side_bet(integer, side_bet_market, side_bet_pick) to authenticated;
