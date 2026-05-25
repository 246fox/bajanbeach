import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";
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

const BeachMap = dynamic(() => import("@/components/BeachMap"), { ssr: false });

export default async function MapPage() {
  const beachCards: BeachCardData[] = await buildBeachCards();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        Barbados beach map
      </h1>
      <div className="mt-10">
        <section className={ABOUT_CARD_CLASS}>
          <BeachMap beachCards={beachCards} />
        </section>
      </div>
    </main>
  );
}
