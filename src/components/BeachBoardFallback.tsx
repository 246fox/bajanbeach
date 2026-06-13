"use client";

import { BeachBoardView } from "@/components/BeachBoardView";
import { ListMapToggleStatic } from "@/components/ListMapToggleStatic";
import {
  getBeachBoardCoastCounts,
  getBeachBoardPhotoBySlug,
  getDisplayedBeachCards
} from "@/lib/beach-board-display";
import type { BeachCardData } from "@/types/beach";

/**
 * Suspense fallback: default board (All / coast sort / empty search) with inert
 * handlers. Client-only so noop callbacks are not passed across the RSC boundary.
 */
export function BeachBoardFallback({ beachCards }: { beachCards: BeachCardData[] }) {
  const displayedCards = getDisplayedBeachCards(beachCards, {
    coastFilter: "All",
    searchQuery: "",
    sortOption: "coast",
    userCoords: null
  });
  const countsByCoast = getBeachBoardCoastCounts(beachCards);
  const photoBySlug = getBeachBoardPhotoBySlug(beachCards);

  return (
    <BeachBoardView
      displayedCards={displayedCards}
      countsByCoast={countsByCoast}
      photoBySlug={photoBySlug}
      coastFilter="All"
      sortOption="coast"
      searchQuery=""
      userCoords={null}
      locationError={null}
      listMapToggle={<ListMapToggleStatic />}
      onSearchQueryChange={() => {}}
      onSortSelectChange={() => {}}
      onCoastPillChange={() => {}}
    />
  );
}
