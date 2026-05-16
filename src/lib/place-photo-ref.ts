/** Validates Places API (New) photo resource name before proxy / save. */
export function isValidGooglePlacePhotoReference(ref: string): boolean {
  const t = ref.trim();
  if (t.length < 24 || t.length > 2048 || t.includes("..")) {
    return false;
  }
  return t.startsWith("places/") && t.includes("/photos/");
}
