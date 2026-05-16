"use server";

import { revalidatePath } from "next/cache";
import { beaches } from "@/data/beaches";
import { requireAdminSession } from "@/lib/admin-session";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isValidGooglePlacePhotoReference } from "@/lib/place-photo-ref";

const BEACH_SLUGS = new Set(beaches.map((b) => b.slug));

export type PhotoOverrideActionState = { error?: string; ok?: boolean };

export async function saveBeachPhotoOverride(
  slug: string,
  photoReference: string
): Promise<PhotoOverrideActionState> {
  await requireAdminSession();

  if (!BEACH_SLUGS.has(slug)) {
    return { error: "Unknown beach slug." };
  }
  if (!isValidGooglePlacePhotoReference(photoReference)) {
    return { error: "Invalid photo reference." };
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("beach_photo_overrides").upsert(
    {
      beach_slug: slug,
      photo_reference: photoReference.trim(),
      updated_at: now
    },
    { onConflict: "beach_slug" }
  );

  if (error) {
    console.error("[admin/photos] upsert failed", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/beaches/${slug}`);
  revalidatePath("/admin/photos");

  return { ok: true };
}

export async function clearBeachPhotoOverride(slug: string): Promise<PhotoOverrideActionState> {
  await requireAdminSession();

  if (!BEACH_SLUGS.has(slug)) {
    return { error: "Unknown beach slug." };
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.from("beach_photo_overrides").delete().eq("beach_slug", slug);

  if (error) {
    console.error("[admin/photos] delete failed", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/beaches/${slug}`);
  revalidatePath("/admin/photos");

  return { ok: true };
}
