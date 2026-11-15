"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { normalizeSearchText } from "@/lib/beach-search";

const DEBOUNCE_MS = 1500;

/**
 * Fire GA4 `search` after the user pauses typing. Only when the normalised
 * query has three or more characters; never twice in a row for the same term
 * on the same surface.
 */
export function useTrackBeachSearch(input: {
  searchQuery: string;
  resultsCount: number;
  searchSurface: "home" | "map";
}): void {
  const { searchQuery, resultsCount, searchSurface } = input;
  const lastFiredTermRef = useRef<string | null>(null);
  const resultsCountRef = useRef(resultsCount);
  resultsCountRef.current = resultsCount;

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const searchTerm = normalizeSearchText(trimmed);

    if (searchTerm.length < 3) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (lastFiredTermRef.current === searchTerm) {
        return;
      }
      lastFiredTermRef.current = searchTerm;
      trackEvent("search", {
        search_term: searchTerm,
        results_count: resultsCountRef.current,
        search_surface: searchSurface
      });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery, searchSurface]);
}
