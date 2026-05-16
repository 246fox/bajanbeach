"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { beaches } from "@/data/beaches";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAllBeachPhotoOverrides } from "@/lib/beach-photo-overrides";
import { getGooglePlacePhotoReferences } from "@/lib/beach-photos";
import { BEACH_PHOTOS_BUCKET, beachHeroStorageObjectPath } from "@/lib/beach-photo-storage";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isValidGooglePlacePhotoReference } from "@/lib/place-photo-ref";

export type BrokenPhotoScanResult = {
  brokenSlugs: string[];
  unverifiedSlugs: string[];
  okCount: number;
  scannedAt: string;
};

const BEACH_SLUGS = new Set(beaches.map((b) => b.slug));

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

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
      image_url: null,
      source: "google_ref",
      updated_at: now
    },
    { onConflict: "beach_slug" }
  );

  if (error) {
    console.error("[admin/photos] google upsert failed", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/beaches/${slug}`);
  revalidatePath("/admin/photos");

  return { ok: true };
}

export async function uploadBeachHeroPhoto(formData: FormData): Promise<PhotoOverrideActionState> {
  await requireAdminSession();

  const slugRaw = formData.get("slug");
  if (typeof slugRaw !== "string" || !BEACH_SLUGS.has(slugRaw)) {
    return { error: "Unknown beach slug." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Choose a photo file." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "File must be 5MB or smaller." };
  }

  if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
    return { error: "Use JPEG, PNG, or WebP." };
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  let jpegBuffer: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    jpegBuffer = await sharp(input).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  } catch (e) {
    console.error("[admin/photos] image normalize failed", e);
    return { error: "Could not read or convert that image." };
  }

  if (jpegBuffer.length > MAX_UPLOAD_BYTES) {
    return { error: "Converted image still exceeds 5MB; try a smaller source image." };
  }

  const objectPath = beachHeroStorageObjectPath(slugRaw);
  const { error: uploadError } = await supabase.storage.from(BEACH_PHOTOS_BUCKET).upload(objectPath, jpegBuffer, {
    contentType: "image/jpeg",
    upsert: true
  });

  if (uploadError) {
    console.error("[admin/photos] storage upload failed", uploadError);
    return { error: uploadError.message };
  }

  const { data: pub } = supabase.storage.from(BEACH_PHOTOS_BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;
  if (!publicUrl) {
    return { error: "Could not resolve public URL for uploaded image." };
  }

  const now = new Date().toISOString();
  const { error: dbError } = await supabase.from("beach_photo_overrides").upsert(
    {
      beach_slug: slugRaw,
      photo_reference: null,
      image_url: publicUrl,
      source: "upload",
      updated_at: now
    },
    { onConflict: "beach_slug" }
  );

  if (dbError) {
    console.error("[admin/photos] upload row upsert failed", dbError);
    return { error: dbError.message };
  }

  revalidatePath("/");
  revalidatePath(`/beaches/${slugRaw}`);
  revalidatePath("/admin/photos");

  return { ok: true };
}

export async function scanBrokenGooglePhotoOverrides(): Promise<
  BrokenPhotoScanResult | { error: string }
> {
  await requireAdminSession();

  const overrides = await fetchAllBeachPhotoOverrides();
  const googleRefBeaches = beaches.filter((b) => overrides.get(b.slug)?.source === "google_ref");

  const brokenSlugs: string[] = [];
  const unverifiedSlugs: string[] = [];
  let okCount = 0;

  for (const beach of googleRefBeaches) {
    const override = overrides.get(beach.slug);
    const stored = override?.photo_reference?.trim() ?? "";
    if (!stored) {
      continue;
    }

    const refs = await getGooglePlacePhotoReferences(beach);
    if (refs.length === 0) {
      unverifiedSlugs.push(beach.slug);
    } else if (!refs.some((r) => r.trim() === stored)) {
      brokenSlugs.push(beach.slug);
    } else {
      okCount += 1;
    }
  }

  brokenSlugs.sort();
  unverifiedSlugs.sort();

  return {
    brokenSlugs,
    unverifiedSlugs,
    okCount,
    scannedAt: new Date().toISOString()
  };
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

  const objectPath = beachHeroStorageObjectPath(slug);
  const { error: removeError } = await supabase.storage.from(BEACH_PHOTOS_BUCKET).remove([objectPath]);
  if (removeError) {
    console.warn("[admin/photos] storage remove (non-fatal)", removeError.message);
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
