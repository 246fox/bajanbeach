"use client";

import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BeachCardData } from "@/types/beach";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";
import { BeachSearchInput } from "@/components/BeachSearchInput";
import { CoastPills } from "@/components/CoastPills";
import { ListMapToggle } from "@/components/ListMapToggle";
import { coastToQueryParam, parseCoastFromQuery, type CoastFilter } from "@/lib/coast-filter";
import { filterBeachesBySearch } from "@/lib/beach-search";

const BeachMap = dynamic(() => import("@/components/BeachMap"), { ssr: false });

type Props = {
  beachCards: BeachCardData[];
};

export function MapExperience({ beachCards }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const coastParam = searchParams.get("coast");
  const coastFilterFromUrl = useMemo(() => parseCoastFromQuery(coastParam), [coastParam]);

  const [coastFilter, setCoastFilter] = useState<CoastFilter>(() =>
    parseCoastFromQuery(coastParam)
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setCoastFilter((current) => (current === coastFilterFromUrl ? current : coastFilterFromUrl));
  }, [coastFilterFromUrl]);

  const updateCoastFilter = (next: CoastFilter) => {
    setCoastFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    const q = coastToQueryParam(next);
    if (q === null) {
      params.delete("coast");
    } else {
      params.set("coast", q);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const coastFiltered = useMemo(() => {
    if (coastFilter === "All") {
      return beachCards;
    }
    return beachCards.filter((b) => b.coast === coastFilter);
  }, [beachCards, coastFilter]);

  const filteredBeachCards = useMemo(
    () => filterBeachesBySearch(coastFiltered, searchQuery),
    [coastFiltered, searchQuery]
  );

  const searchActive = searchQuery.trim() !== "";
  const showEmptySearchMessage = searchActive && filteredBeachCards.length === 0;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        Barbados beach map
      </h1>

      <div className="mt-10">
        <ListMapToggle />
      </div>

      <div className="mt-4 flex justify-center">
        <div className="w-full max-w-md">
          <label htmlFor="map-beach-search" className="sr-only">
            Find a beach
          </label>
          <BeachSearchInput
            id="map-beach-search"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {showEmptySearchMessage ? (
            <p className="mt-2 text-sm text-slate-500" aria-live="polite">
              No beaches match your search
            </p>
          ) : null}
        </div>
      </div>

      <CoastPills activeCoast={coastFilter} onChange={updateCoastFilter} />

      <div className="mt-10">
        <section className={ABOUT_CARD_CLASS}>
          <BeachMap beachCards={filteredBeachCards} />
        </section>
      </div>
    </>
  );
}
