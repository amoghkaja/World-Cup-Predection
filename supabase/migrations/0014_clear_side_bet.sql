-- ===========================================================
-- 0014 — Let a player remove a side bet before kickoff (changed their mind).
-- Mirrors clear_joker (0010): a SECURITY DEFINER RPC that deletes the row only
-- while the match is still open. Run in the Supabase SQL editor.
-- ===========================================================

create or replace function public.clear_side_bet(p_match_id integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.side_bets
   where user_id = v_uid and match_id = p_match_id
     and now() < public.match_kickoff(match_id);
end $$;
grant execute on function public.clear_side_bet(integer) to authenticated;
