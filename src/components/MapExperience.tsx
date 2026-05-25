"use client";

import type { BeachCardData } from "@/types/beach";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";
import { ListMapToggle } from "@/components/ListMapToggle";
import { MapCoastFilter } from "@/components/MapCoastFilter";

type Props = {
  beachCards: BeachCardData[];
};

export function MapExperience({ beachCards }: Props) {
  return (
    <>
      <ListMapToggle />
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        Barbados beach map
      </h1>
      <div className="mt-10">
        <section className={ABOUT_CARD_CLASS}>
          <MapCoastFilter beachCards={beachCards} />
        </section>
      </div>
    </>
  );
}
