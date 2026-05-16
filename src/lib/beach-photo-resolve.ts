import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import { buildPlacePhotoMediaUrl } from "@/lib/beach-photos";

/**
 * Public hero image: Supabase override ref → media URL, else first Google URL, else placeholder.
 */
export function resolvePublicBeachHeroUrl(
  overrideRef: string | null | undefined,
  googlePhotoUrls: string[]
): string {
  if (overrideRef) {
    const url = buildPlacePhotoMediaUrl(overrideRef);
    if (url) {
      return url;
    }
  }
  return googlePhotoUrls[0] ?? BEACH_PHOTO_PLACEHOLDER;
}
