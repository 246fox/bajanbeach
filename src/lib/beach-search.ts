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

export type SearchHighlightRange = {
  /** Inclusive start index in the original text. */
  start: number;
  /** Exclusive end index in the original text. */
  end: number;
};

type OriginalWord = {
  /** Lowercase letters/digits only (apostrophes and full stops already stripped). */
  norm: string;
  /** Original index for each character in `norm`. */
  origIndices: number[];
};

function isLetterOrDigit(ch: string): boolean {
  return /\p{L}/u.test(ch) || /\p{N}/u.test(ch);
}

function isStrippedPunctuation(ch: string): boolean {
  return ch === "'" || ch === "\u2019" || ch === ".";
}

/**
 * Walk original text with the same stripping/separator rules as normalizeSearchText,
 * producing one entry per normalised word and the original index of each kept char.
 */
function extractOriginalWords(originalText: string): OriginalWord[] {
  const words: OriginalWord[] = [];
  let norm = "";
  let origIndices: number[] = [];

  const flush = () => {
    if (norm.length > 0) {
      words.push({ norm, origIndices });
    }
    norm = "";
    origIndices = [];
  };

  for (let i = 0; i < originalText.length; i++) {
    const ch = originalText[i];
    if (isStrippedPunctuation(ch)) {
      continue;
    }
    if (isLetterOrDigit(ch)) {
      norm += ch.toLowerCase();
      origIndices.push(i);
      continue;
    }
    flush();
  }
  flush();
  return words;
}

function mergeHighlightRanges(ranges: SearchHighlightRange[]): SearchHighlightRange[] {
  if (ranges.length === 0) {
    return [];
  }
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: SearchHighlightRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/**
 * Character ranges in `originalText` for query words that match as word-start
 * prefixes (same rules as prose matching). Empty / short-mode queries → [].
 * Each range covers only the matched leading letters (plus stripped punctuation
 * that falls strictly between those letters, e.g. the apostrophe in Smiton's).
 */
export function getSearchHighlightRanges(
  originalText: string,
  query: string
): SearchHighlightRange[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const normalizedQuery = normalizeSearchText(trimmed);
  if (!normalizedQuery) {
    return [];
  }
  const parsed = queryWords(normalizedQuery);
  if (parsed.mode === "short") {
    return [];
  }

  const ranges: SearchHighlightRange[] = [];
  for (const word of extractOriginalWords(originalText)) {
    for (const token of parsed.words) {
      if (!word.norm.startsWith(token)) {
        continue;
      }
      const matchedIndices = word.origIndices.slice(0, token.length);
      if (matchedIndices.length === 0) {
        continue;
      }
      const start = matchedIndices[0];
      const end = matchedIndices[matchedIndices.length - 1] + 1;
      ranges.push({ start, end });
    }
  }
  return mergeHighlightRanges(ranges);
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
