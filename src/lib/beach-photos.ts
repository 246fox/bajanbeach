import type { Beach } from "@/types/beach";
import { unstable_cache } from "next/cache";

type TextSearchResponse = {
  places?: Array<{
    id?: string;
    photos?: Array<{
      name?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    [key: string]: unknown;
  };
};

type PlaceDetailsResponse = {
  photos?: Array<{
    name?: string;
    [key: string]: unknown;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type GoogleApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type BeachPhotoSearchFields = Pick<Beach, "name" | "photoSearchName">;

/** Full Places `textQuery` for photo search (alias verbatim, else `{name} Barbados`). */
export function placesPhotoTextQuery(beach: BeachPhotoSearchFields): string {
  const alias = beach.photoSearchName?.trim();
  if (alias) {
    return alias;
  }
  return `${beach.name.trim()} Barbados`;
}

function normalizePhotoQueryCacheKey(textQuery: string): string {
  return textQuery.trim().toLowerCase();
}

function buildPhotoUrl(photoReference: string, apiKey: string): string {
  const params = new URLSearchParams({
    maxHeightPx: "800",
    key: apiKey
  });
  return `https://places.googleapis.com/v1/${photoReference}/media?${params.toString()}`;
}

/** Build a browser-loadable Places media URL from a photo resource name (requires server env key). */
export function buildPlacePhotoMediaUrl(photoReference: string): string | null {
  const apiKey = googleMapsKey();
  if (!apiKey || !photoReference.trim()) {
    return null;
  }
  return buildPhotoUrl(photoReference.trim(), apiKey);
}

async function readGoogleError(response: Response): Promise<{
  httpStatus: number;
  apiCode: number | null;
  apiStatus: string | null;
  apiMessage: string | null;
}> {
  let payload: GoogleApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as GoogleApiErrorPayload;
  } catch {
    // Ignore JSON parse failures and log HTTP status only.
  }

  return {
    httpStatus: response.status,
    apiCode: payload?.error?.code ?? null,
    apiStatus: payload?.error?.status ?? null,
    apiMessage: payload?.error?.message ?? null
  };
}

function logPlacesFailure(
  stage: "text-search" | "place-details",
  textQuery: string,
  details: {
    httpStatus: number;
    apiCode: number | null;
    apiStatus: string | null;
    apiMessage: string | null;
  }
) {
  console.error("[beach-photos] Google Places request failed", {
    stage,
    textQuery,
    httpStatus: details.httpStatus,
    apiCode: details.apiCode,
    apiStatus: details.apiStatus,
    apiMessage: details.apiMessage
  });
}

export function googleMapsKey(): string | undefined {
  return process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
}

/** Uncached Places fetch — all photo resource names returned by Google (no slice). */
async function fetchGooglePlacePhotoReferencesForTextQuery(textQuery: string): Promise<string[]> {
  const trimmed = textQuery.trim();
  if (!trimmed) {
    return [];
  }

  const apiKey = googleMapsKey();
  if (!apiKey) {
    throw new Error("No Google API key configured");
  }

  const textSearchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.photos"
    },
    body: JSON.stringify({
      textQuery: trimmed
    })
  });

  if (!textSearchResponse.ok) {
    const errorDetails = await readGoogleError(textSearchResponse);
    logPlacesFailure("text-search", trimmed, errorDetails);
    throw new Error(`Text Search failed (${textSearchResponse.status})`);
  }

  const textSearchData = (await textSearchResponse.json()) as TextSearchResponse;
  const placeId = textSearchData.places?.[0]?.id;
  if (!placeId) {
    return [];
  }

  const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "photos"
    }
  });

  if (!detailsResponse.ok) {
    const errorDetails = await readGoogleError(detailsResponse);
    logPlacesFailure("place-details", trimmed, errorDetails);
    throw new Error(`Place Details failed (${detailsResponse.status})`);
  }

  const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse;
  return (detailsData.photos ?? [])
    .map((photo) => photo.name)
    .filter((name): name is string => Boolean(name));
}

/**
 * All Google Places photo resource names for a beach (admin gallery + internal slice source).
 * Cache key includes the effective text query (name vs photoSearchName).
 */
export async function getGooglePlacePhotoReferences(beach: BeachPhotoSearchFields): Promise<string[]> {
  const textQuery = placesPhotoTextQuery(beach);
  if (!textQuery.trim()) {
    return [];
  }

  const cacheTag = normalizePhotoQueryCacheKey(textQuery);

  try {
    return await unstable_cache(
      async () => fetchGooglePlacePhotoReferencesForTextQuery(textQuery),
      ["beach-photo-refs", "v2", cacheTag],
      { revalidate: 604800 }
    )();
  } catch (error) {
    console.error("[beach-photos] Failed to fetch photo references", {
      textQuery,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return [];
  }
}

/** Up to five browser-loadable Google photo URLs (legacy helper; public site uses resolver + overrides). */
export async function getBeachPhotoUrls(beach: BeachPhotoSearchFields): Promise<string[]> {
  const refs = await getGooglePlacePhotoReferences(beach);
  const apiKey = googleMapsKey();
  if (!apiKey) {
    return [];
  }
  return refs.slice(0, 5).map((ref) => buildPhotoUrl(ref, apiKey));
}
