import { createServiceSupabase } from "@/lib/supabase/service";

export type BeachPhotoOverrideRow = {
  beach_slug: string;
  photo_reference: string;
  updated_at: string;
};

export async function fetchAllBeachPhotoOverrides(): Promise<Map<string, string>> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("beach_photo_overrides")
    .select("beach_slug, photo_reference");

  if (error) {
    console.error("[beach-photo-overrides] fetchAll failed", error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.beach_slug && row.photo_reference) {
      map.set(row.beach_slug, String(row.photo_reference).trim());
    }
  }
  return map;
}

export async function fetchPhotoOverrideForSlug(slug: string): Promise<string | null> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("beach_photo_overrides")
    .select("photo_reference")
    .eq("beach_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[beach-photo-overrides] fetchOne failed", { slug, message: error.message });
    return null;
  }

  return data?.photo_reference != null ? String(data.photo_reference).trim() : null;
}
