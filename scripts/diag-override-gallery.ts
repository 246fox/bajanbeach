/**
 * One-off diagnostic: compare beach_photo_overrides.photo_reference to
 * current Google Places Details photo names (same source as admin grid).
 *
 * Run from repo root: npx tsx scripts/diag-override-gallery.ts
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { beaches } from "../src/data/beaches";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function fetchGalleryRefs(beachName: string, apiKey: string): Promise<string[]> {
  const trimmed = beachName.trim();
  const textSearchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.photos"
    },
    body: JSON.stringify({ textQuery: `${trimmed} Barbados` })
  });
  if (!textSearchResponse.ok) {
    throw new Error(`searchText ${textSearchResponse.status}`);
  }
  const textSearchData = (await textSearchResponse.json()) as { places?: { id?: string }[] };
  const placeId = textSearchData.places?.[0]?.id;
  if (!placeId) return [];

  const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "photos"
    }
  });
  if (!detailsResponse.ok) {
    throw new Error(`place details ${detailsResponse.status}`);
  }
  const detailsData = (await detailsResponse.json()) as {
    photos?: { name?: string }[];
  };
  return (detailsData.photos ?? [])
    .map((p) => p.name)
    .filter((n): n is string => Boolean(n));
}

function summarizeRef(label: string, ref: string) {
  return {
    label,
    length: ref.length,
    prefix80: ref.slice(0, 80),
    suffix40: ref.slice(-40)
  };
}

loadEnvLocal();

async function main() {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gkey = process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!gkey) {
  console.error("Need GOOGLE_MAPS_KEY or NEXT_PUBLIC_GOOGLE_MAPS_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: overrides, error } = await supabase
  .from("beach_photo_overrides")
  .select("beach_slug, photo_reference");

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

const slugToBeach = new Map(beaches.map((b) => [b.slug, b]));

console.log("\n=== Override vs gallery reference comparison (live API + DB) ===\n");
console.log(`Overrides in DB: ${(overrides ?? []).length}\n`);

for (const row of overrides ?? []) {
  const slug = row.beach_slug as string;
  const stored = (row.photo_reference as string)?.trim() ?? "";
  const beach = slugToBeach.get(slug);
  const beachName = beach?.name ?? "(unknown slug)";

  console.log("—".repeat(72));
  console.log(`BEACH: ${beachName}  slug=${slug}`);
  console.log("(a) STORED photo_reference:", JSON.stringify(summarizeRef("stored", stored)));

  let gallery: string[] = [];
  try {
    gallery = await fetchGalleryRefs(beachName, gkey);
  } catch (e) {
    console.log("(b) GALLERY: FETCH FAILED", e instanceof Error ? e.message : e);
    console.log("exactMatchIndex: N/A\n");
    continue;
  }

  console.log(`(b) GALLERY: ${gallery.length} photo name(s) from Place Details`);
  gallery.forEach((ref, i) => {
    const eq = ref === stored;
    console.log(
      `    [${i}] len=${ref.length} exactEqStored=${eq}  prefix=${ref.slice(0, 60)}…`
    );
  });

  const exactIdx = gallery.findIndex((r) => r === stored);
  console.log(`\n>>> exactMatchIndex: ${exactIdx}  (${exactIdx >= 0 ? "MATCH — highlight should work" : "NO EXACT STRING MATCH — highlight will fail"})`);

  if (exactIdx < 0 && stored.length > 0) {
    const closest = gallery
      .map((r, i) => ({
        i,
        dist: levenshteinSmall(stored, r, 400),
        commonPrefix: commonPrefixLen(stored, r)
      }))
      .sort((a, b) => b.commonPrefix - a.commonPrefix)[0];
    if (closest) {
      console.log(
        `    closestByCommonPrefix: index=${closest.i} commonPrefixLen=${closest.commonPrefix} (not used for UI; diagnostic only)`
      );
    }
  }
  console.log("");
}

}

function commonPrefixLen(a: string, b: string): number {
  let n = 0;
  const m = Math.min(a.length, b.length);
  while (n < m && a[n] === b[n]) n++;
  return n;
}

/** Cheap bounded edit distance sample for "are these almost the same" */
function levenshteinSmall(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const al = Math.min(a.length, max);
  const bl = Math.min(b.length, max);
  let cost = Math.abs(al - bl);
  for (let i = 0; i < Math.min(al, bl); i++) {
    if (a[i] !== b[i]) cost++;
  }
  return cost;
}

void main();