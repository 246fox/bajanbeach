"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BeachCardData } from "@/types/beach";
import { BeachBoardView } from "@/components/BeachBoardView";
import { ListMapToggle } from "@/components/ListMapToggle";
import {
  coastToQueryParam,
  type CoastFilter,
  parseCoastFromQuery
} from "@/lib/coast-filter";
import {
  getBeachBoardCoastCounts,
  getBeachBoardPhotoBySlug,
  getDisplayedBeachCards,
  type BeachBoardSortOption
} from "@/lib/beach-board-display";
import type { VibeCard } from "@/lib/beach-board-vibe-cards";
import { trackEvent } from "@/lib/analytics";

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

  const countsByCoast = useMemo(() => getBeachBoardCoastCounts(beachCards), [beachCards]);

  const photoBySlug = useMemo(() => getBeachBoardPhotoBySlug(beachCards), [beachCards]);

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

  const handleSortSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
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

  const handleVibeTileClick = (event: MouseEvent<HTMLAnchorElement>, card: VibeCard) => {
    trackEvent("select_vibe", { coast: card.coast, vibe_label: card.vibe });
    event.preventDefault();
    updateCoastFilter(card.coast, { scrollToGrid: true });
  };

  return (
    <BeachBoardView
      displayedCards={displayedCards}
      countsByCoast={countsByCoast}
      photoBySlug={photoBySlug}
      coastFilter={coastFilter}
      sortOption={sortOption}
      searchQuery={searchQuery}
      userCoords={userCoords}
      locationError={locationError}
      listMapToggle={<ListMapToggle />}
      onSearchQueryChange={setSearchQuery}
      onSortSelectChange={handleSortSelectChange}
      onCoastPillChange={(next) => updateCoastFilter(next)}
      onVibeTileClick={handleVibeTileClick}
    />
  );
}
