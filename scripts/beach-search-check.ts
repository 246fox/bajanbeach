/**
 * Assertion harness for beach search matching and coast-sort order.
 *
 *   npm run search:check
 */
import { beaches } from "../src/data/beaches";
import {
  filterBeachesBySearch,
  getSearchMatchRank,
  normalizeSearchText,
  type SearchMatchRank
} from "../src/lib/beach-search";
import { COAST_FILTERS } from "../src/lib/coast-filter";
import { getDisplayedBeachCards } from "../src/lib/beach-board-display";
import type { Beach, BeachCardData, BeachCoast } from "../src/types/beach";

const EMPTY_CONDITIONS = {
  waveHeight: null,
  wavePeriod: null,
  windSpeed: null,
  windDirection: null,
  swimScore: null,
  lastUpdatedAt: null
};

function toCard(beach: Beach): BeachCardData {
  return {
    ...beach,
    conditions: EMPTY_CONDITIONS,
    photoUrl: null,
    heroClass: "bg-sky-300",
    sargassum: { status: "unavailable" }
  };
}

const cards: BeachCardData[] = beaches.map((b) => toCard(b));

function coastSortRank(coast: BeachCoast): number {
  const i = COAST_FILTERS.indexOf(coast);
  return i > 0 ? i - 1 : 0;
}

/** Pre-change coast-then-name slug order (independent of search). */
function expectedEmptyCoastSlugOrder(list: BeachCardData[]): string[] {
  return [...list]
    .sort((a, b) => {
      const byCoast = coastSortRank(a.coast) - coastSortRank(b.coast);
      if (byCoast !== 0) {
        return byCoast;
      }
      return a.name.localeCompare(b.name);
    })
    .map((b) => b.slug);
}

function printMatches(label: string, query: string): BeachCardData[] {
  const matched = filterBeachesBySearch(cards, query);
  const lines = matched.map((b) => {
    const rank = getSearchMatchRank(b, query);
    return `  ${b.slug} (rank ${rank})`;
  });
  console.log(`\n[${label}] query=${JSON.stringify(query)} → ${matched.length} match(es)`);
  for (const line of lines) {
    console.log(line);
  }
  return matched;
}

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

function slugsOf(list: BeachCardData[]): string[] {
  return list.map((b) => b.slug);
}

function hasSlug(list: BeachCardData[], slug: string): boolean {
  return list.some((b) => b.slug === slug);
}

function rankOf(slug: string, query: string): SearchMatchRank | null {
  const beach = cards.find((b) => b.slug === slug);
  if (!beach) {
    return null;
  }
  return getSearchMatchRank(beach, query);
}

console.log(`beach-search-check: ${cards.length} beaches`);

// "" returns every beach
{
  const matched = filterBeachesBySearch(cards, "");
  assert(matched.length === cards.length, `"" returns every beach (${matched.length} === ${cards.length})`);
  assert(
    matched.every((b, i) => b === cards[i]),
    `"" returns the same array reference contents / order as input`
  );
}

// Fish Pot / fish pot / by the fish pot
for (const q of ["Fish Pot", "fish pot", "by the fish pot"] as const) {
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "smitons-bay"), `${JSON.stringify(q)} includes smitons-bay`);
}

// Little Good Harbour → smitons-bay at rank 3
{
  const q = "Little Good Harbour";
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "smitons-bay"), `"${q}" includes smitons-bay`);
  assert(rankOf("smitons-bay", q) === 3, `"${q}" smitons-bay rank is 3 (got ${rankOf("smitons-bay", q)})`);
}

// smiton's / Smitons → rank 1
for (const q of ["smiton's", "Smitons"] as const) {
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "smitons-bay"), `${JSON.stringify(q)} includes smitons-bay`);
  assert(rankOf("smitons-bay", q) === 1, `${JSON.stringify(q)} smitons-bay rank is 1 (got ${rankOf("smitons-bay", q)})`);
}

// smitons-bay slug
{
  const q = "smitons-bay";
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "smitons-bay"), `"${q}" includes smitons-bay`);
  assert(rankOf("smitons-bay", q) === 1, `"${q}" smitons-bay rank is 1`);
}

// st peter — all St. Peter parish beaches
{
  const q = "st peter";
  const matched = printMatches(q, q);
  const stPeterSlugs = cards.filter((b) => b.parish === "St. Peter").map((b) => b.slug);
  assert(hasSlug(matched, "smitons-bay"), `"${q}" includes smitons-bay`);
  const missing = stPeterSlugs.filter((s) => !hasSlug(matched, s));
  assert(
    missing.length === 0,
    `"${q}" includes every St. Peter beach (missing: ${missing.join(", ") || "none"})`
  );
}

// Wyndham → sam-lords-beach rank 3
{
  const q = "Wyndham";
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "sam-lords-beach"), `"${q}" includes sam-lords-beach`);
  assert(
    rankOf("sam-lords-beach", q) === 3,
    `"${q}" sam-lords-beach rank is 3 (got ${rankOf("sam-lords-beach", q)})`
  );
}

// Crane → crane-beach rank 1 and first under coast sort
{
  const q = "Crane";
  const matched = printMatches(q, q);
  assert(hasSlug(matched, "crane-beach"), `"${q}" includes crane-beach`);
  assert(rankOf("crane-beach", q) === 1, `"${q}" crane-beach rank is 1 (got ${rankOf("crane-beach", q)})`);

  const displayed = getDisplayedBeachCards(cards, {
    coastFilter: "All",
    searchQuery: q,
    sortOption: "coast",
    userCoords: null
  });
  assert(
    displayed[0]?.slug === "crane-beach",
    `"Crane" via getDisplayedBeachCards All/coast has crane-beach first (got ${displayed[0]?.slug ?? "empty"})`
  );
}

// zzzz
{
  const matched = filterBeachesBySearch(cards, "zzzz");
  printMatches("zzzz", "zzzz");
  assert(matched.length === 0, `"zzzz" returns nothing`);
}

// every beach exact name → that beach at rank 1
{
  let nameOk = true;
  for (const b of cards) {
    const matched = filterBeachesBySearch(cards, b.name);
    if (!hasSlug(matched, b.slug) || getSearchMatchRank(b, b.name) !== 1) {
      nameOk = false;
      console.error(`FAIL: exact name ${JSON.stringify(b.name)} → slug ${b.slug} rank 1`);
      failures += 1;
      break;
    }
  }
  if (nameOk) {
    console.log(`PASS: every beach exact name includes that beach at rank 1`);
  }
}

// every beach exact slug → that beach at rank 1
{
  let slugOk = true;
  for (const b of cards) {
    const matched = filterBeachesBySearch(cards, b.slug);
    if (!hasSlug(matched, b.slug) || getSearchMatchRank(b, b.slug) !== 1) {
      slugOk = false;
      console.error(`FAIL: exact slug ${JSON.stringify(b.slug)} → rank 1`);
      failures += 1;
      break;
    }
  }
  if (slugOk) {
    console.log(`PASS: every beach exact slug includes that beach at rank 1`);
  }
}

// empty query + coast sort = pre-change coast-then-name order
{
  const displayed = getDisplayedBeachCards(cards, {
    coastFilter: "All",
    searchQuery: "",
    sortOption: "coast",
    userCoords: null
  });
  const expected = expectedEmptyCoastSlugOrder(cards);
  const actual = slugsOf(displayed);
  assert(
    actual.length === expected.length && actual.every((s, i) => s === expected[i]),
    `empty query + coast sort matches pre-change coast-then-name slug order`
  );
}

// Review-only (no assert)
printMatches("review ark", "ark");
printMatches("review pot", "pot");
printMatches("review bay", "bay");

console.log(`\nnormalize sample: ${JSON.stringify(normalizeSearchText("Smiton's Bay"))}`);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log(`\nAll assertions passed`);
