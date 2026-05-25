import { beaches } from "@/data/beaches";
import { fetchBeachConditions } from "@/lib/beach-conditions";
import { fetchAllBeachPhotoOverrides } from "@/lib/beach-photo-overrides";
import { getBeachPhotoUrlsUnlessOverridden } from "@/lib/beach-photos";
import { resolvePublicBeachHeroUrl } from "@/lib/beach-photo-resolve";
import {
  coastForSargassumLookup,
  fetchSargassumByCoast,
  rowToDisplay,
  sargassumLevelForScoring
} from "@/lib/sargassum";
import type { BeachCardData } from "@/types/beach";

const HERO_BG_CLASSES = [
  "bg-sky-300",
  "bg-cyan-300",
  "bg-blue-300",
  "bg-teal-300",
  "bg-indigo-300",
  "bg-sky-200"
];

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      results[i] = await mapper(items[i], i);
    }
  }

  const pool = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

export async function buildBeachCards(): Promise<BeachCardData[]> {
  const [sargassumByCoast, photoOverrides] = await Promise.all([
    fetchSargassumByCoast(),
    fetchAllBeachPhotoOverrides()
  ]);

  const beachCards: BeachCardData[] = await mapWithConcurrency(beaches, 4, async (beach, index) => {
    const override = photoOverrides.get(beach.slug) ?? null;
    const sargassumCoast = coastForSargassumLookup(beach);
    const [conditions, photoUrls] = await Promise.all([
      fetchBeachConditions(beach, {
        sargassumLevel: sargassumLevelForScoring(sargassumByCoast[sargassumCoast])
      }),
      getBeachPhotoUrlsUnlessOverridden(beach, override)
    ]);
    return {
      ...beach,
      conditions,
      photoUrl: resolvePublicBeachHeroUrl(override, photoUrls),
      heroClass: HERO_BG_CLASSES[index % HERO_BG_CLASSES.length],
      sargassum: rowToDisplay(sargassumByCoast[sargassumCoast])
    };
  });

  return beachCards;
}
