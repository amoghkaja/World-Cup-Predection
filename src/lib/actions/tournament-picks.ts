"use server";

import { revalidatePath } from "next/cache";
import { getTeams, tournamentLockAt } from "@/lib/queries";
import { isLocked } from "@/lib/format";
import type { PodiumPosition } from "@/lib/types";
import { type Result, requireUser, isIntIn } from "./shared";

// ---------------- Group qualifier predictions ----------------
export async function saveGroupPrediction(input: {
  groupLabel: string;
  winnerId: number | null;
  runnerupId: number | null;
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    if (typeof input.groupLabel !== "string" || !/^[A-L]$/.test(input.groupLabel)) {
      return { ok: false, error: "Invalid group" };
    }
    if (input.winnerId != null && input.winnerId === input.runnerupId) {
      return { ok: false, error: "Winner and runner-up must be different teams." };
    }
    // Both picks must be teams that actually play in this group.
    const teams = await getTeams();
    const inGroup = (id: number | null) =>
      id == null || teams.some((t) => t.id === id && t.group_label === input.groupLabel);
    if (!inGroup(input.winnerId) || !inGroup(input.runnerupId)) {
      return { ok: false, error: "Pick teams from this group." };
    }
    const lockAt = await tournamentLockAt();
    if (lockAt && isLocked(lockAt)) {
      return { ok: false, error: "Group picks locked at the first kickoff." };
    }

    const { error } = await supabase.from("group_predictions").upsert(
      {
        user_id: userId,
        group_label: input.groupLabel,
        pred_winner_team_id: input.winnerId,
        pred_runnerup_team_id: input.runnerupId,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,group_label" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/groups");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Tournament predictions (golden boot etc.) ----------------
export async function saveTournamentPrediction(input: {
  type: "champion" | "finalist" | "golden_boot";
  teamId: number | null;
  textValue?: string | null;
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();

    if (!["champion", "finalist", "golden_boot"].includes(input.type)) {
      return { ok: false, error: "Invalid pick type" };
    }
    const lockAt = await tournamentLockAt();
    if (lockAt && isLocked(lockAt)) {
      return { ok: false, error: "Locked at the first kickoff." };
    }

    const text = typeof input.textValue === "string" ? input.textValue.trim().slice(0, 80) : null;

    // Golden Boot must be a real player from the squad list (when we have one) —
    // the picker enforces this in the UI, this enforces it against direct calls.
    if (input.type === "golden_boot" && text) {
      // Escape ilike wildcards so "%" can't match an arbitrary player.
      const pattern = text.replace(/[\\%_]/g, "\\$&");
      const { data: hit } = await supabase
        .from("players")
        .select("id")
        .ilike("name", pattern)
        .limit(1)
        .maybeSingle();
      if (!hit) {
        const { count } = await supabase
          .from("players")
          .select("id", { count: "exact", head: true });
        if ((count ?? 0) > 0) {
          return { ok: false, error: "Pick a player from the list." };
        }
      }
    }

    // Atomic single-pick-per-type write (unique (user_id, type) from migration
    // 0008) — the old delete-then-insert could race into duplicate picks.
    const { error } = await supabase.from("tournament_predictions").upsert(
      {
        user_id: userId,
        type: input.type,
        team_id: input.teamId,
        text_value: text,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,type" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tournament");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Podium (top-3) predictions ----------------
export async function savePodiumPick(input: {
  position: PodiumPosition;
  teamId: number | null;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (![1, 2, 3].includes(input.position)) return { ok: false, error: "Invalid position" };
    if (input.teamId != null && !isIntIn(input.teamId, 1, 100000)) {
      return { ok: false, error: "Invalid team" };
    }
    // All podium writes go through a SECURITY DEFINER function that enforces the
    // two-window rule and computes original/revised server-side. Users can't write
    // the table directly (migration 0004 revokes it), so the early/late value and
    // the "revised" flag can't be forged.
    const { error } = await supabase.rpc("save_podium_pick", {
      p_position: input.position,
      p_team_id: input.teamId,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/tournament");
    revalidatePath("/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
