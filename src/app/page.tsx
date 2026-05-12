import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { BeachBoard } from "@/components/BeachBoard";
import { beaches } from "@/data/beaches";
import { fetchBeachConditions } from "@/lib/beach-conditions";
import { getBeachPhotoUrls } from "@/lib/beach-photos";
import { fetchSargassumByCoast, rowToDisplay, sargassumLevelForScoring } from "@/lib/sargassum";
import type { BeachCardData } from "@/types/beach";

export const revalidate = 300;

const HOME_SEO_TITLE = "BajanBeach — The Barbados Beach Guide";
const HOME_SEO_DESCRIPTION =
  "Local insights, live conditions, and sargassum updates for 63 Barbados beaches. From calm West Coast swimming to Soup Bowl surf — find your perfect beach today.";

export const metadata: Metadata = {
  title: HOME_SEO_TITLE,
  description: HOME_SEO_DESCRIPTION,
  openGraph: {
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION
  },
  twitter: {
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION
  }
};

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

export default async function Home() {
  const sargassumByCoast = await fetchSargassumByCoast();

  const beachCards: BeachCardData[] = await mapWithConcurrency(beaches, 8, async (beach, index) => {
    const [conditions, photoUrls] = await Promise.all([
      fetchBeachConditions(beach, {
        sargassumLevel: sargassumLevelForScoring(sargassumByCoast[beach.coast])
      }),
      getBeachPhotoUrls(beach.name)
    ]);
    return {
      ...beach,
      conditions,
      photoUrl: photoUrls[0] ?? null,
      heroClass: HERO_BG_CLASSES[index % HERO_BG_CLASSES.length],
      sargassum: rowToDisplay(sargassumByCoast[beach.coast])
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean-700">
          Barbados Beach Guide
        </p>
        <div className="mt-3 flex justify-center">
          <Image
            src="/logo.jpeg"
            alt="BajanBeach logo"
            width={400}
            height={128}
            className="h-auto w-[240px] sm:w-[320px]"
            priority
          />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Local insights and live beach conditions for 63 Barbados beaches. Updated hourly.
        </p>
      </section>

      <Suspense fallback={null}>
        <BeachBoard beachCards={beachCards} />
      </Suspense>
    </main>
  );
}
