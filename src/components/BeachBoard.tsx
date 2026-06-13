"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BeachCardData, BeachCoast } from "@/types/beach";
import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import { formatDistanceKm, haversineKm } from "@/lib/distance";
import { BeachSearchInput } from "@/components/BeachSearchInput";
import { BeachCard } from "@/components/BeachCard";
import { CoastIntroBanner } from "@/components/CoastIntroBanner";
import { CoastPills } from "@/components/CoastPills";
import { ListMapToggle } from "@/components/ListMapToggle";
import {
  COAST_FILTERS,
  coastToQueryParam,
  type CoastFilter,
  parseCoastFromQuery
} from "@/lib/coast-filter";
import { getDisplayedBeachCards, type BeachBoardSortOption } from "@/lib/beach-board-display";
import { trackEvent } from "@/lib/analytics";
import { isSupabaseStorageUrl } from "@/lib/is-supabase-storage-url";

type VibeCard = {
  coast: Exclude<CoastFilter, "All">;
  vibe: string;
  beachName: string;
  slug: string;
  fallbackClass: string;
};

const VIBE_CARDS: VibeCard[] = [
  {
    coast: "West",
    vibe: "Idyllic & Calm",
    beachName: "Heron Bay",
    slug: "heron-bay",
    fallbackClass: "bg-sky-300"
  },
  {
    coast: "East",
    vibe: "Wild & Surfy",
    beachName: "Soup Bowl",
    slug: "soup-bowl",
    fallbackClass: "bg-blue-400"
  },
  {
    coast: "Southeast",
    vibe: "Dramatic & Secluded",
    beachName: "Bottom Bay",
    slug: "bottom-bay",
    fallbackClass: "bg-indigo-400"
  },
  {
    coast: "South",
    vibe: "Lively & Active",
    beachName: "Carlisle Bay",
    slug: "carlisle-bay",
    fallbackClass: "bg-cyan-300"
  },
  {
    coast: "North",
    vibe: "Rugged & Adventurous",
    beachName: "Animal Flower Cave",
    slug: "animal-flower-cave",
    fallbackClass: "bg-teal-400"
  }
];

const SESSION_LOCATION_KEY = "bajanbeach:userLocation";

function readSessionLocation(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_LOCATION_KEY);
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    if (
      typeof o.lat === "number" &&
      typeof o.lng === "number" &&
      Number.isFinite(o.lat) &&
      Number.isFinite(o.lng)
    ) {
      return { lat: o.lat, lng: o.lng };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSessionLocation(lat: number, lng: number): void {
  sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify({ lat, lng }));
}

const SORT_OPTIONS: { value: BeachBoardSortOption; label: string }[] = [
  { value: "coast", label: "Coast" },
  { value: "name", label: "Name (A-Z)" },
  { value: "swim", label: "Best for swimming today" },
  { value: "surf", label: "Best for surfing today" },
  { value: "scenic", label: "Best for scenic visits today" },
  { value: "nearest", label: "Nearest first" }
];

const SORT_QUERY_TO_VALUE: Record<string, BeachBoardSortOption> = {
  name: "name",
  swim: "swim",
  surf: "surf",
  scenic: "scenic",
  nearest: "nearest"
};

function parseSortFromQuery(value: string | null): BeachBoardSortOption {
  if (!value) {
    return "coast";
  }
  return SORT_QUERY_TO_VALUE[value.toLowerCase()] ?? "coast";
}

export function BeachBoard({ beachCards }: { beachCards: BeachCardData[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const coastParam = searchParams.get("coast");
  const sortParam = searchParams.get("sort");
  const [coastFilter, setCoastFilter] = useState<CoastFilter>(() =>
    parseCoastFromQuery(coastParam)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<BeachBoardSortOption>(() =>
    parseSortFromQuery(sortParam)
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const pendingGeoRef = useRef(false);

  useEffect(() => {
    const nextFilter = parseCoastFromQuery(coastParam);
    setCoastFilter((currentFilter) => (currentFilter === nextFilter ? currentFilter : nextFilter));
    const nextSort = parseSortFromQuery(sortParam);
    setSortOption((currentSort) => (currentSort === nextSort ? currentSort : nextSort));
  }, [coastParam, sortParam]);

  useEffect(() => {
    const sortQ = searchParams.get("sort")?.toLowerCase();
    if (sortQ !== "nearest") {
      return;
    }
    const loc = readSessionLocation();
    if (loc) {
      setUserCoords(loc);
      return;
    }
    if (pendingGeoRef.current) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sort");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setSortOption("coast");
  }, [searchParams, pathname, router]);

  const displayedCards = useMemo(
    () =>
      getDisplayedBeachCards(beachCards, {
        coastFilter,
        searchQuery,
        sortOption,
        userCoords
      }),
    [beachCards, coastFilter, searchQuery, sortOption, userCoords]
  );

  const searchActive = searchQuery.trim() !== "";

  const countsByCoast = useMemo(() => {
    const counts: Record<BeachCoast, number> = {
      North: 0,
      West: 0,
      South: 0,
      Southeast: 0,
      East: 0
    };
    for (const b of beachCards) {
      counts[b.coast] += 1;
    }
    return counts;
  }, [beachCards]);

  const photoBySlug = useMemo(() => {
    const entries = beachCards.map((beach) => [beach.slug, beach.photoUrl] as const);
    return new Map(entries);
  }, [beachCards]);

  const updateCoastFilter = (nextFilter: CoastFilter, options?: { scrollToGrid?: boolean }) => {
    setCoastFilter(nextFilter);

    const params = new URLSearchParams(searchParams.toString());
    const coastQ = coastToQueryParam(nextFilter);
    if (coastQ === null) {
      params.delete("coast");
    } else {
      params.set("coast", coastQ);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    if (options?.scrollToGrid) {
      requestAnimationFrame(() => {
        document.getElementById("beach-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const updateSortOption = (nextSort: BeachBoardSortOption) => {
    setSortOption(nextSort);

    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === "coast") {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleSortSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as BeachBoardSortOption;
    if (value === sortOption) {
      return;
    }

    setLocationError(null);

    if (value === "nearest") {
      const cached = readSessionLocation();
      if (cached) {
        setUserCoords(cached);
        updateSortOption("nearest");
        return;
      }

      const previous = sortOption;
      pendingGeoRef.current = true;
      updateSortOption("nearest");

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        pendingGeoRef.current = false;
        updateSortOption(previous);
        setLocationError("Allow location access to sort by distance.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pendingGeoRef.current = false;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          writeSessionLocation(lat, lng);
          setUserCoords({ lat, lng });
          setLocationError(null);
        },
        () => {
          pendingGeoRef.current = false;
          updateSortOption(previous);
          setUserCoords(null);
          setLocationError("Allow location access to sort by distance.");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
      );
      return;
    }

    updateSortOption(value);
  };

  return (
    <>
      <section className="mt-10 overflow-hidden rounded-3xl border border-ocean-100/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
          Pick your beach vibe
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Choose a coast style, then jump into matching beaches.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-6">
          {VIBE_CARDS.map((card, index) => {
            const photoUrl = photoBySlug.get(card.slug) ?? null;
            const desktopSpanClass = index < 3 ? "md:col-span-2" : "md:col-span-3";
            return (
              <a
                key={card.coast}
                href={`/?coast=${card.coast.toLowerCase()}`}
                onClick={(event) => {
                  trackEvent("select_vibe", { coast: card.coast, vibe_label: card.vibe });
                  event.preventDefault();
                  updateCoastFilter(card.coast, { scrollToGrid: true });
                }}
                className={`group relative block overflow-hidden rounded-2xl border border-ocean-100/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 ${desktopSpanClass}`}
              >
                <div
                  className={`relative h-40 w-full overflow-hidden sm:h-44 md:h-48 ${photoUrl ? "" : card.fallbackClass}`}
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      unoptimized={!isSupabaseStorageUrl(photoUrl)}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/25 to-slate-900/5 transition group-hover:from-slate-900/60" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <p className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-white/40">
                      {card.coast}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
                      {card.vibe}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">{card.beachName}</p>
                    {photoUrl === BEACH_PHOTO_PLACEHOLDER ? (
                      <p className="mt-1.5 text-[10px] font-normal tracking-wide text-white/45">
                        Photo unavailable
                      </p>
                    ) : null}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <div className="mt-10">
        <ListMapToggle />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="beach-search" className="sr-only">
            Find a beach
          </label>
          <BeachSearchInput id="beach-search" value={searchQuery} onChange={setSearchQuery} />
          {searchActive && (
            <p className="text-xs text-slate-600" aria-live="polite">
              {displayedCards.length} beaches found
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col justify-center sm:w-72 lg:w-80">
          <label htmlFor="beach-sort" className="sr-only">
            Sort beaches
          </label>
          <div className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-ocean-100/80 bg-white px-3 py-2 shadow-sm focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-400/35">
            <span className="shrink-0 text-sm font-medium text-slate-600">Sort:</span>
            <select
              id="beach-sort"
              value={sortOption}
              onChange={handleSortSelectChange}
              title="Sort beaches"
              className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {locationError ? (
            <p className="mt-1.5 text-xs text-slate-600" aria-live="polite">
              {locationError}
            </p>
          ) : null}
        </div>
      </div>

      <CoastPills activeCoast={coastFilter} onChange={(next) => updateCoastFilter(next)} />

      {coastFilter !== "All" && (
        <CoastIntroBanner
          key={coastFilter}
          coast={coastFilter}
          count={countsByCoast[coastFilter]}
        />
      )}

      <section id="beach-grid" className="mt-8 scroll-mt-8">
        {displayedCards.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">No beaches match your search</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedCards.map((beach) => (
              <BeachCard
                key={beach.slug}
                beach={beach}
                nearestDistanceLabel={
                  sortOption === "nearest" && userCoords
                    ? formatDistanceKm(
                        haversineKm(userCoords.lat, userCoords.lng, beach.latitude, beach.longitude)
                      )
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
