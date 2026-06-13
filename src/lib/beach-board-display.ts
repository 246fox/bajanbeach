import { filterBeachesBySearch } from "@/lib/beach-search";
import { haversineKm } from "@/lib/distance";
import { COAST_FILTERS, type CoastFilter } from "@/lib/coast-filter";
import type { BeachCardData, BeachCoast } from "@/types/beach";

export type BeachBoardSortOption =
  | "coast"
  | "name"
  | "swim"
  | "surf"
  | "scenic"
  | "nearest";

/** Matches coast filter chip order — North first, East last. */
function coastSortRank(coast: BeachCoast): number {
  const i = COAST_FILTERS.indexOf(coast);
  return i > 0 ? i - 1 : 0;
}

function compareScoreDesc(a: BeachCardData, b: BeachCardData): number {
  const sa = a.conditions.swimScore;
  const sb = b.conditions.swimScore;
  if (sa === null && sb === null) {
    return 0;
  }
  if (sa === null) {
    return 1;
  }
  if (sb === null) {
    return -1;
  }
  return sb - sa;
}

export function getDisplayedBeachCards(
  beachCards: BeachCardData[],
  input: {
    coastFilter: CoastFilter;
    searchQuery: string;
    sortOption: BeachBoardSortOption;
    userCoords: { lat: number; lng: number } | null;
  }
): BeachCardData[] {
  const { coastFilter, searchQuery, sortOption, userCoords } = input;

  const coastFiltered =
    coastFilter === "All" ? beachCards : beachCards.filter((b) => b.coast === coastFilter);

  const searchFiltered = filterBeachesBySearch(coastFiltered, searchQuery);

  const list = searchFiltered;
  switch (sortOption) {
    case "coast":
      return [...list].sort((a, b) => {
        const byCoast = coastSortRank(a.coast) - coastSortRank(b.coast);
        if (byCoast !== 0) {
          return byCoast;
        }
        return a.name.localeCompare(b.name);
      });
    case "name":
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    case "swim": {
      const swim = list.filter(
        (b) => (b.seaState === "calm" || b.seaState === "moderate") && !b.isSurfSpot
      );
      return [...swim].sort(compareScoreDesc);
    }
    case "surf": {
      const surf = list.filter((b) => b.isSurfSpot);
      return [...surf].sort(compareScoreDesc);
    }
    case "scenic": {
      const scenic = list.filter((b) => b.seaState === "rough");
      return [...scenic].sort(compareScoreDesc);
    }
    case "nearest": {
      if (!userCoords) {
        return [...list];
      }
      return [...list].sort((a, b) => {
        const da = haversineKm(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
        const db = haversineKm(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
        return da - db;
      });
    }
    default:
      return list;
  }
}
