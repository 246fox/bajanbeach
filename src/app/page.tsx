import type { Metadata } from "next";
import { Suspense } from "react";
import { BeachBoard } from "@/components/BeachBoard";
import { beaches } from "@/data/beaches";
import { buildBeachCards } from "@/lib/build-beach-cards";
import type { BeachCardData } from "@/types/beach";

export const revalidate = 3600;

const HOME_SEO_TITLE = "BajanBeach — The Barbados Beach Guide";
const HOME_SEO_DESCRIPTION =
  `Local insights, live conditions, and sargassum updates for ${beaches.length} Barbados beaches. From calm West Coast swimming to Soup Bowl surf — find your perfect beach today.`;

export const metadata: Metadata = {
  title: HOME_SEO_TITLE,
  description: HOME_SEO_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION
  },
  twitter: {
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION
  }
};

export default async function Home() {
  const beachCards: BeachCardData[] = await buildBeachCards();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean-700">
          Barbados Beach Guide
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Local insights and live beach conditions for {beaches.length} Barbados beaches. Updated hourly.
        </p>
      </section>

      <Suspense fallback={null}>
        <BeachBoard beachCards={beachCards} />
      </Suspense>
    </main>
  );
}
