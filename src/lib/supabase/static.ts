import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Cookie-less anon client for public, cacheable reads (teams, matches, players,
 * leaderboard — all RLS-readable by anon). Because it never touches request
 * cookies it is safe to use inside unstable_cache(), which is what lets us serve
 * tournament-wide data from the data cache instead of hitting Postgres on every
 * page view.
 */
export function createStaticClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
