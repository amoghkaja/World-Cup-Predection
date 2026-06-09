-- Correct the two placeholder teams to the real 2026 draw (per football-data.org):
--   Group E: Costa Rica (CRC) -> Ivory Coast (CIV)
--   Group H: Chile (CHI)      -> Cape Verde (CPV)
-- Idempotent: matches on the old FIFA code, so it only fires once. Team ids stay
-- the same, so existing predictions keep referencing the same rows.

update public.teams
  set name = 'Ivory Coast', code = 'CIV', flag_emoji = '🇨🇮'
  where code = 'CRC';

update public.teams
  set name = 'Cape Verde', code = 'CPV', flag_emoji = '🇨🇻'
  where code = 'CHI';
