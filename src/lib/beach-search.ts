import { stripMarkdown } from "@/lib/strip-markdown";
import type { BeachCardData } from "@/types/beach";

export type SearchMatchRank = 1 | 2 | 3 | 4;

/**
 * Lowercase; remove apostrophes (' and ') and full stops; replace hyphens and
 * every other non letter/digit with a space; collapse spaces; trim.
 * Unicode letters and digits are kept as word characters.
 */
export function normalizeSearchText(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/['’.]/g, "");
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  s = s.replace(/ +/g, " ").trim();
  return s;
}

function wordList(normalized: string): string[] {
  if (!normalized) {
    return [];
  }
  return normalized.split(" ").filter(Boolean);
}

function queryWords(normalizedQuery: string): { mode: "words"; words: string[] } | { mode: "short"; query: string } {
  const words = wordList(normalizedQuery);
  const long = words.filter((w) => w.length >= 3);
  if (long.length > 0) {
    return { mode: "words", words: long };
  }
  return { mode: "short", query: normalizedQuery };
}

function wordStartsWithToken(fieldNormalized: string, token: string): boolean {
  for (const w of wordList(fieldNormalized)) {
    if (w.startsWith(token)) {
      return true;
    }
  }
  return false;
}

type BeachSearchIndex = {
  name: string;
  slug: string;
  parish: string;
  hotelNames: { raw: string; normalized: string }[];
  description: string;
  bestFor: string;
  notes: string;
};

function indexBeach(beach: BeachCardData): BeachSearchIndex {
  const hotelNames: { raw: string; normalized: string }[] = [];
  for (const link of beach.stayLinks ?? []) {
    if (link.hotelName) {
      hotelNames.push({
        raw: link.hotelName,
        normalized: normalizeSearchText(link.hotelName)
      });
    }
  }
  return {
    name: normalizeSearchText(beach.name),
    slug: normalizeSearchText(beach.slug),
    parish: normalizeSearchText(beach.parish),
    hotelNames,
    description: normalizeSearchText(stripMarkdown(beach.description)),
    bestFor: normalizeSearchText(beach.bestFor),
    notes: normalizeSearchText(stripMarkdown(beach.notes))
  };
}

/** Strongest (lowest) tier for one query word against an indexed beach, or null. */
function tierForWord(index: BeachSearchIndex, word: string): SearchMatchRank | null {
  if (index.name.includes(word) || index.slug.includes(word)) {
    return 1;
  }
  if (index.parish.includes(word)) {
    return 2;
  }
  for (const h of index.hotelNames) {
    if (wordStartsWithToken(h.normalized, word)) {
      return 3;
    }
  }
  if (
    wordStartsWithToken(index.description, word) ||
    wordStartsWithToken(index.bestFor, word) ||
    wordStartsWithToken(index.notes, word)
  ) {
    return 4;
  }
  return null;
}

/**
 * Beach match rank = weakest (highest) tier among query words, or null if no match.
 * Empty query → null.
 */
export function getSearchMatchRank(beach: BeachCardData, query: string): SearchMatchRank | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  const normalizedQuery = normalizeSearchText(trimmed);
  if (!normalizedQuery) {
    return null;
  }

  const parsed = queryWords(normalizedQuery);
  const index = indexBeach(beach);

  if (parsed.mode === "short") {
    if (index.name.includes(parsed.query) || index.slug.includes(parsed.query)) {
      return 1;
    }
    if (index.parish.includes(parsed.query)) {
      return 2;
    }
    return null;
  }

  let weakest: SearchMatchRank | null = null;
  for (const word of parsed.words) {
    const tier = tierForWord(index, word);
    if (tier === null) {
      return null;
    }
    if (weakest === null || tier > weakest) {
      weakest = tier;
    }
  }
  return weakest;
}

/**
 * First stayLinks hotelName in which a query word matches as a word-start prefix,
 * only when the beach's match rank is exactly 3. Otherwise null.
 */
export function getMatchedHotelName(beach: BeachCardData, query: string): string | null {
  if (getSearchMatchRank(beach, query) !== 3) {
    return null;
  }

  const trimmed = query.trim();
  const normalizedQuery = normalizeSearchText(trimmed);
  const parsed = queryWords(normalizedQuery);
  if (parsed.mode === "short") {
    return null;
  }

  const index = indexBeach(beach);
  for (const h of index.hotelNames) {
    for (const word of parsed.words) {
      if (wordStartsWithToken(h.normalized, word)) {
        return h.raw;
      }
    }
  }
  return null;
}

/** Case-insensitive match on name, parish, slug, prose, and hotel names. Returns `beaches` unchanged when `query` is empty (after trim). */
export function filterBeachesBySearch(
  beaches: BeachCardData[],
  query: string
): BeachCardData[] {
  if (!query.trim()) {
    return beaches;
  }
  return beaches.filter((b) => getSearchMatchRank(b, query) !== null);
}
