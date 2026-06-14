import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExperience } from "@/components/MapExperience";
import { beaches } from "@/data/beaches";
import { buildBeachCards } from "@/lib/build-beach-cards";
import { fetchOffshoreConditions } from "@/lib/offshore-conditions";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Barbados Beach Map — BajanBeach",
  description: `All ${beaches.length} Barbados beaches on one map. See live wave conditions and find your beach by location.`,
  alternates: {
    canonical: "/map"
  }
};

export default async function MapPage() {
  const [beachCards, offshoreConditions] = await Promise.all([
    buildBeachCards(),
    fetchOffshoreConditions()
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={null}>
        <MapExperience beachCards={beachCards} offshoreConditions={offshoreConditions} />
      </Suspense>
    </main>
  );
}
