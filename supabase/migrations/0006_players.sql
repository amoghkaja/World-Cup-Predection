-- Player list for the Golden Boot picker. Populated once from football-data.org
-- squads by the results sync (1 API call, only when the table is empty).

create table if not exists public.players (
  id integer primary key,          -- football-data.org player id
  name text not null,
  nationality text,
  position text
);
create index if not exists players_name_idx on public.players (name);

alter table public.players enable row level security;

drop policy if exists "players readable by all" on public.players;
create policy "players readable by all" on public.players for select using (true);
