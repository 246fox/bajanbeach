/** Known-problem beaches — shown first when "Priority only" filter is active. */
export const PRIORITY_BEACH_SLUGS = [
  "derricks-beach",
  "st-lawrence-beach",
  "sam-lords-beach",
  "miami-beach",
  "pebbles-beach",
  "hangmans-bay",
  "inch-marlow-beach",
  "maycocks-bay",
  "freshwater-bay",
  "holetown-beach",
  "drill-hall-beach",
  "oistins-bay",
  "skeetes-bay",
  "barclays-park-beach",
  "bath-beach",
  "sandy-lane-bay"
] as const;

const PRIORITY_INDEX: Map<string, number> = new Map(
  PRIORITY_BEACH_SLUGS.map((slug, index) => [slug, index])
);

export function isPriorityBeachSlug(slug: string): boolean {
  return PRIORITY_INDEX.has(slug);
}

export function prioritySortKey(slug: string): number {
  return PRIORITY_INDEX.get(slug) ?? 999;
}
