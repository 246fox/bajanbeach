export const BEACH_PHOTOS_BUCKET = "beach-photos";

export function beachHeroStorageObjectPath(slug: string): string {
  return `overrides/${slug}.jpg`;
}
