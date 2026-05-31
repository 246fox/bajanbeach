"use client";

import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OffshoreConditionsResult } from "@/lib/offshore-conditions";
import type { BeachCardData } from "@/types/beach";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";
import { BeachPinContent } from "@/components/BeachPinContent";
import { BeachSearchInput } from "@/components/BeachSearchInput";
import { CoastPills } from "@/components/CoastPills";
import { ListMapToggle } from "@/components/ListMapToggle";
import { coastToQueryParam, parseCoastFromQuery, type CoastFilter } from "@/lib/coast-filter";
import { filterBeachesBySearch } from "@/lib/beach-search";
import { MAP_VIEWPORT_DESKTOP_MQ } from "@/lib/map-viewport";
import { OffshoreTile } from "@/components/OffshoreTile";

const BeachMap = dynamic(() => import("@/components/BeachMap"), { ssr: false });

type Props = {
  beachCards: BeachCardData[];
  offshoreConditions: OffshoreConditionsResult;
};

export function MapExperience({ beachCards, offshoreConditions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const coastParam = searchParams.get("coast");
  const coastFilterFromUrl = useMemo(() => parseCoastFromQuery(coastParam), [coastParam]);

  const [coastFilter, setCoastFilter] = useState<CoastFilter>(() =>
    parseCoastFromQuery(coastParam)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeach, setSelectedBeach] = useState<BeachCardData | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? !window.matchMedia(MAP_VIEWPORT_DESKTOP_MQ).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MAP_VIEWPORT_DESKTOP_MQ);
    const update = () => setIsMobileViewport(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  const showMobileSheet = selectedBeach !== null && isMobileViewport;

  const dismissSheet = useCallback(() => {
    setSelectedBeach(null);
  }, []);

  const offshoreWestRow = useMemo(
    () => offshoreConditions.find((r) => r.id === "offshore-west"),
    [offshoreConditions]
  );
  const offshoreEastRow = useMemo(
    () => offshoreConditions.find((r) => r.id === "offshore-east"),
    [offshoreConditions]
  );

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        Barbados beach map
      </h1>

      <div className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
        <p>
          Pins are colored by sea conditions — green is calmest, red is roughest — with today&apos;s 1–10 score on
          each. Calm beaches are scored for swimming; rougher scenic beaches (shown with a dark outline) are scored for their scenery.{" "}
          <a
            href="https://bajanbeach.com/about#scores"
            className="font-medium text-ocean-700 transition hover:text-ocean-600"
          >
            How scoring works →
          </a>
        </p>
      </div>

      <div className="mt-8">
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
          <div className="relative">
            <BeachMap
              beachCards={filteredBeachCards}
              offshoreConditions={offshoreConditions}
              plantOffshoreMarkersOnMap={!isMobileViewport}
              selectedBeach={selectedBeach}
              onBeachSelect={setSelectedBeach}
            />
          </div>
          {isMobileViewport && offshoreWestRow && offshoreEastRow ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <div className="flex min-w-0 shrink justify-center">
                <OffshoreTile row={offshoreWestRow} />
              </div>
              <div className="flex min-w-0 shrink justify-center">
                <OffshoreTile row={offshoreEastRow} />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showMobileSheet ? (
        <>
          <button
            type="button"
            aria-label="Dismiss beach details"
            className="fixed inset-0 z-[55] bg-slate-900/40"
            onClick={dismissSheet}
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="relative px-5 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
              <button
                type="button"
                onClick={dismissSheet}
                className="absolute right-4 top-2 rounded-full p-1.5 text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6.4 4.55 12 10.15l5.6-5.6 1.85 1.85-5.6 5.6 5.6 5.6-1.85 1.85-5.6-5.6-5.6 5.6-1.85-1.85 5.6-5.6-5.6-5.6Z"
                  />
                </svg>
              </button>
            </div>
            <div className="px-5 pb-8 pt-1">
              <BeachPinContent beach={selectedBeach} layout="sheet" />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
