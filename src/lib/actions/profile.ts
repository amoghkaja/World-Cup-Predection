"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAG_LEADERBOARD } from "@/lib/queries";
import { type Result, requireUser } from "./shared";

// ---------------- Profile ----------------
// Show / hide the Google profile photo. When hidden, everyone (including the
// leaderboard view, server-side) sees initials instead.
export async function setAvatarHidden(hidden: boolean): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .update({ hide_avatar: !!hidden })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    updateTag(TAG_LEADERBOARD);
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateDisplayName(name: string): Promise<Result> {
  try {
    const { supabase, userId } = await requireUser();
    const clean = String(name).replace(/\s+/g, " ").trim().slice(0, 40);
    if (!clean) return { ok: false, error: "Name cannot be empty" };
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    updateTag(TAG_LEADERBOARD);
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
