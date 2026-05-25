import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExperience } from "@/components/MapExperience";
import { buildBeachCards } from "@/lib/build-beach-cards";
import type { BeachCardData } from "@/types/beach";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Barbados Beach Map — BajanBeach",
  description:
    "All 65 Barbados beaches on one map. See live wave conditions and find your beach by location.",
  alternates: {
    canonical: "/map"
  }
};

export default async function MapPage() {
  const beachCards: BeachCardData[] = await buildBeachCards();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={null}>
        <MapExperience beachCards={beachCards} />
      </Suspense>
    </main>
  );
}
