-- ===========================================================
-- 0017 — Knockout side-bet markets. Adds a `market` discriminator to side_bets
-- so a match can carry BTTS *plus* the two knockout bets ("goes to extra time?"
-- and "decided on penalties?"). Existing rows are all BTTS. Widens uniqueness to
-- (user, match, market) and updates the save/clear RPCs to take the market.
-- Follows the 0010/0014 SECURITY DEFINER + revoke pattern. Run in a transaction.
-- ===========================================================

do $$ begin
  create type side_bet_market as enum ('btts','et','pens');
exception when duplicate_object then null; end $$;

-- Add market, backfill existing rows as the BTTS they are, then enforce NOT NULL.
alter table public.side_bets add column if not exists market side_bet_market;
update public.side_bets set market = 'btts' where market is null;
alter table public.side_bets
  alter column market set not null,
  alter column market set default 'btts';

-- One bet per (user, match, market) — was (user, match).
alter table public.side_bets drop constraint if exists side_bets_user_id_match_id_key;
alter table public.side_bets
  add constraint side_bets_user_match_market_key unique (user_id, match_id, market);

-- ---------- RPCs: take the market; drop + replace the old signatures ----------
drop function if exists public.save_side_bet(integer, side_bet_pick);
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
end $$;
grant execute on function public.save_side_bet(integer, side_bet_market, side_bet_pick) to authenticated;

drop function if exists public.clear_side_bet(integer);
create or replace function public.clear_side_bet(p_match_id integer, p_market side_bet_market)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  delete from public.side_bets
   where user_id = v_uid and match_id = p_match_id and market = p_market
     and now() < public.match_kickoff(match_id);
end $$;
grant execute on function public.clear_side_bet(integer, side_bet_market) to authenticated;

-- Clients still never write the table directly (re-assert the 0010 revoke over
-- the new column surface). All writes go through the SECURITY DEFINER RPCs.
revoke insert, update, delete on public.side_bets from authenticated, anon;
