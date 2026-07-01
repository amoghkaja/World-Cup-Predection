"use server";

import { getMatch } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import { featuresLive, type SideBetPick } from "@/lib/scoring";
import type { SideBetMarket } from "@/lib/types";
import {
  type Result,
  LOCKED_MSG,
  requireUser,
  isIntIn,
  isSideBetMarket,
  isRlsDenied,
  revalidateMatchSurfaces,
} from "./shared";

// ---------------- Side bets (opt-in gambles) ----------------
export async function saveSideBet(input: {
  matchId: number;
  market: SideBetMarket;
  pick: SideBetPick;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();

    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (input.pick !== "yes" && input.pick !== "no") return { ok: false, error: "Invalid pick" };
    if (!isSideBetMarket(input.market)) return { ok: false, error: "Invalid market" };

    if (!featuresLive()) return { ok: false, error: "Side bets unlock Monday." };

    const match = await getMatch(input.matchId);
    if (!match) return { ok: false, error: "Match not found" };
    if (isLocked(match.kickoff_at) || match.status !== "scheduled") {
      return { ok: false, error: LOCKED_MSG };
    }
    // BTTS is allowed on any match; the ET/pens markets only exist in knockouts.
    if ((input.market === "et" || input.market === "pens") && match.stage === "group") {
      return { ok: false, error: "That bet is knockouts only." };
    }

    const { error } = await supabase.rpc("save_side_bet", {
      p_match_id: input.matchId,
      p_market: input.market,
      p_pick: input.pick,
    });
    if (error) {
      if (isRlsDenied(error)) return { ok: false, error: LOCKED_MSG };
      return { ok: false, error: error.message };
    }

    // ET and penalties are the two mutually-exclusive ways a tie ends beyond 90,
    // so you only ever back one. The save_side_bet RPC (migration 0019) already
    // drops the opposite market; this explicit clear is kept as belt-and-braces
    // for environments where 0019 hasn't been applied yet.
    if (input.market === "et" || input.market === "pens") {
      const other = input.market === "et" ? "pens" : "et";
      await supabase.rpc("clear_side_bet", { p_match_id: input.matchId, p_market: other });
    }

    revalidateMatchSurfaces(input.matchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Remove a side bet before kickoff (changed their mind). The RPC itself guards
// the deadline; the path revalidation keeps the chips/controls fresh.
export async function clearSideBet(input: {
  matchId: number;
  market: SideBetMarket;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (!isSideBetMarket(input.market)) return { ok: false, error: "Invalid market" };
    const { error } = await supabase.rpc("clear_side_bet", {
      p_match_id: input.matchId,
      p_market: input.market,
    });
    if (error) return { ok: false, error: error.message };
    revalidateMatchSurfaces(input.matchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Joker / double-down ----------------
export async function saveJoker(input: { matchId: number }): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    if (!featuresLive()) return { ok: false, error: "The joker unlocks Monday." };

    const match = await getMatch(input.matchId);
    if (!match) return { ok: false, error: "Match not found" };
    if (isLocked(match.kickoff_at) || match.status !== "scheduled") {
      return { ok: false, error: LOCKED_MSG };
    }

    const { error } = await supabase.rpc("save_joker", { p_match_id: input.matchId });
    if (error) return { ok: false, error: error.message };

    revalidateMatchSurfaces(input.matchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function clearJoker(input: { matchId: number }): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (!isIntIn(input.matchId, 1, 100000)) return { ok: false, error: "Invalid match" };
    const { error } = await supabase.rpc("clear_joker", { p_match_id: input.matchId });
    if (error) return { ok: false, error: error.message };
    revalidateMatchSurfaces(input.matchId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
