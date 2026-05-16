import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import type { BeachPhotoOverrideData } from "@/lib/beach-photo-overrides";
import { buildPlacePhotoMediaUrl } from "@/lib/beach-photos";

/** True when a saved override alone can resolve the public hero (no live Google gallery needed). */
export function overrideProvidesHero(override: BeachPhotoOverrideData | null | undefined): boolean {
  if (!override) {
    return false;
  }
  if (override.source === "upload" && override.image_url?.trim()) {
    return true;
  }
  if (override.source === "google_ref" && override.photo_reference?.trim()) {
    return true;
  }
  return false;
}

/**
 * upload → image_url; google_ref → Places media URL from reference; else Google [0] or placeholder.
 */
export function resolvePublicBeachHeroUrl(
  override: BeachPhotoOverrideData | null | undefined,
  googlePhotoUrls: string[]
): string {
  if (override?.source === "upload" && override.image_url?.trim()) {
    return override.image_url.trim();
  }
  if (override?.source === "google_ref" && override.photo_reference) {
    const url = buildPlacePhotoMediaUrl(override.photo_reference);
    if (url) {
      return url;
    }
  }
  return googlePhotoUrls[0] ?? BEACH_PHOTO_PLACEHOLDER;
}
