// Shared plumbing for the server-action modules. NOT a "use server" file —
// it exports non-async helpers, which the action modules import.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SideBetMarket } from "@/lib/types";

export type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export const LOCKED_MSG = "This match is locked — the deadline has passed.";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) throw new Error("Not signed in");
  return { supabase, userId: sub };
}

export async function requireAdmin() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
  if (!data?.is_admin) throw new Error("Admin only");
  return { userId };
}

export const isIntIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

export const isSideBetMarket = (v: unknown): v is SideBetMarket =>
  v === "btts" || v === "et" || v === "pens";

/** RLS blocks writes once a match kicks off — map that to the friendly message. */
export const isRlsDenied = (e: { code?: string; message: string }) =>
  e.code === "42501" || /row-level security/i.test(e.message);

/** Every surface that renders a match's pick/bet state. */
export function revalidateMatchSurfaces(matchId: number) {
  revalidatePath("/dashboard");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/predictions");
}

/** Accent/case-insensitive name key: "José Martínez " → "josemartinez". */
export const nameKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
