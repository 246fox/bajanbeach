"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BeachCoast } from "@/types/beach";
import { requireAdminSession } from "@/lib/admin-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import type { SargassumLevelValue } from "@/lib/sargassum";

const COASTS: BeachCoast[] = ["North", "West", "South", "Southeast", "East"];

const LEVELS: SargassumLevelValue[] = ["low", "medium", "high"];

export type SaveSargassumState = { error?: string };

export async function saveSargassumLevels(
  _prev: SaveSargassumState | undefined,
  formData: FormData
): Promise<SaveSargassumState> {
  await requireAdminSession();

  const supabase = createServiceSupabase();
  if (!supabase) {
    return { error: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const now = new Date().toISOString();
  const rows = [];

  for (const coast of COASTS) {
    const levelRaw = formData.get(`level_${coast}`);
    const notesRaw = formData.get(`notes_${coast}`);

    const level = typeof levelRaw === "string" ? levelRaw.trim() : "";
    if (!LEVELS.includes(level as SargassumLevelValue)) {
      return { error: `Invalid level for ${coast}.` };
    }

    const notes =
      typeof notesRaw === "string" && notesRaw.trim() !== "" ? notesRaw.trim() : null;

    rows.push({
      coast,
      level,
      notes,
      updated_at: now,
      source: "manual",
      confidence: null as number | null
    });
  }

  const { error } = await supabase.from("sargassum_levels").upsert(rows, { onConflict: "coast" });

  if (error) {
    console.error("[admin/sargassum] Upsert failed", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/beaches/[slug]", "page");

  redirect("/admin/sargassum?saved=1");
}
