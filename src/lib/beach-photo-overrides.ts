import { createServiceSupabase } from "@/lib/supabase/service";

export type BeachPhotoOverrideSource = "google_ref" | "upload";

export type BeachPhotoOverrideData = {
  source: BeachPhotoOverrideSource;
  photo_reference: string | null;
  image_url: string | null;
};

function normalizeRow(row: {
  beach_slug: string;
  photo_reference: string | null;
  image_url: string | null;
  source: string | null;
}): BeachPhotoOverrideData | null {
  const source = row.source === "upload" ? "upload" : "google_ref";
  const ref = row.photo_reference != null ? String(row.photo_reference).trim() : null;
  const url = row.image_url != null ? String(row.image_url).trim() : null;

  if (source === "upload" && url) {
    return { source: "upload", photo_reference: null, image_url: url };
  }
  if (source === "google_ref" && ref) {
    return { source: "google_ref", photo_reference: ref, image_url: null };
  }
  return null;
}

export async function fetchAllBeachPhotoOverrides(): Promise<Map<string, BeachPhotoOverrideData>> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("beach_photo_overrides")
    .select("beach_slug, photo_reference, image_url, source");

  if (error) {
    console.error("[beach-photo-overrides] fetchAll failed", error.message);
    return new Map();
  }

  const map = new Map<string, BeachPhotoOverrideData>();
  for (const row of data ?? []) {
    if (!row.beach_slug) {
      continue;
    }
    const normalized = normalizeRow({
      beach_slug: row.beach_slug,
      photo_reference: row.photo_reference as string | null,
      image_url: row.image_url as string | null,
      source: row.source as string | null
    });
    if (normalized) {
      map.set(row.beach_slug, normalized);
    }
  }
  return map;
}

export async function fetchPhotoOverrideForSlug(
  slug: string
): Promise<BeachPhotoOverrideData | null> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("beach_photo_overrides")
    .select("photo_reference, image_url, source")
    .eq("beach_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[beach-photo-overrides] fetchOne failed", { slug, message: error.message });
    return null;
  }

  if (!data) {
    return null;
  }

  return normalizeRow({
    beach_slug: slug,
    photo_reference: data.photo_reference as string | null,
    image_url: data.image_url as string | null,
    source: data.source as string | null
  });
}
