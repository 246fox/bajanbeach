import type { BeachCardData } from "@/types/beach";

/** Case-insensitive substring match on name, parish, and slug. Returns `beaches` unchanged when `query` is empty (after trim). */
export function filterBeachesBySearch(
  beaches: BeachCardData[],
  query: string
): BeachCardData[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return beaches;
  }
  return beaches.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.parish.toLowerCase().includes(q) ||
      b.slug.toLowerCase().includes(q)
  );
}
