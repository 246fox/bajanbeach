/**
 * True when `src` is a public Supabase Storage object URL for this project
 * (same host as NEXT_PUBLIC_SUPABASE_URL and standard public object path).
 * Used with next/image: only these URLs are optimized; others stay unoptimized.
 */
export function isSupabaseStorageUrl(src: string): boolean {
  if (!src.startsWith("https://")) {
    return false;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base?.trim()) {
    return false;
  }
  try {
    const allowedHost = new URL(base.trim()).hostname;
    const u = new URL(src);
    return (
      u.hostname === allowedHost && u.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
