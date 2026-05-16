import type { BeachPhotoOverrideData } from "@/lib/beach-photo-overrides";
import { overrideProvidesHero } from "@/lib/beach-photo-resolve";
import type { Beach } from "@/types/beach";
import { unstable_cache } from "next/cache";

const PHOTO_REFS_SUCCESS_CACHE_VERSION = "v4";
const PHOTO_REFS_FAILURE_CACHE_VERSION = "v1";
/** Back off retryable Places failures (quota, 5xx) — distinct from 7-day success cache. */
const PHOTO_REFS_FAILURE_BACKOFF_SECONDS = 900;

type TextSearchResponse = {
  places?: Array<{
    id?: string;
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

/** Thrown when photo refs must not be cached (empty, missing place, or retryable failure). */
export class BeachPhotoRefsCacheSkipError extends Error {
  constructor(
    message: string,
    readonly reason: "no_place_id" | "no_photos" | "empty_query"
  ) {
    super(message);
    this.name = "BeachPhotoRefsCacheSkipError";
  }
}

/** Transient Places failure (quota, 5xx) — short failure-cache backoff, not 7-day success. */
export class BeachPhotoRefsRetryableError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null = null
  ) {
    super(message);
    this.name = "BeachPhotoRefsRetryableError";
  }
}

class PhotoRefsBackoffProbeMissError extends Error {
  constructor() {
    super("Photo refs failure backoff cache miss");
    this.name = "PhotoRefsBackoffProbeMissError";
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

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
    throw new BeachPhotoRefsCacheSkipError("Empty text query", "empty_query");
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
      "X-Goog-FieldMask": "places.id"
    },
    body: JSON.stringify({
      textQuery: trimmed
    })
  });

  if (!textSearchResponse.ok) {
    const errorDetails = await readGoogleError(textSearchResponse);
    logPlacesFailure("text-search", trimmed, errorDetails);
    if (isRetryableHttpStatus(textSearchResponse.status)) {
      throw new BeachPhotoRefsRetryableError(
        `Text Search failed (${textSearchResponse.status})`,
        textSearchResponse.status
      );
    }
    throw new Error(`Text Search failed (${textSearchResponse.status})`);
  }

  const textSearchData = (await textSearchResponse.json()) as TextSearchResponse;
  const placeId = textSearchData.places?.[0]?.id;
  if (!placeId) {
    throw new BeachPhotoRefsCacheSkipError(
      `Text Search returned no place id for "${trimmed}"`,
      "no_place_id"
    );
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
    if (isRetryableHttpStatus(detailsResponse.status)) {
      throw new BeachPhotoRefsRetryableError(
        `Place Details failed (${detailsResponse.status})`,
        detailsResponse.status
      );
    }
    throw new Error(`Place Details failed (${detailsResponse.status})`);
  }

  const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse;
  const refs = (detailsData.photos ?? [])
    .map((photo) => photo.name)
    .filter((name): name is string => Boolean(name));

  if (refs.length === 0) {
    throw new BeachPhotoRefsCacheSkipError(
      `Place Details returned no photos for "${trimmed}"`,
      "no_photos"
    );
  }

  return refs;
}

async function isPhotoRefsBackedOff(cacheTag: string): Promise<boolean> {
  try {
    const marker = await unstable_cache(
      async () => {
        throw new PhotoRefsBackoffProbeMissError();
      },
      ["beach-photo-refs-failure", PHOTO_REFS_FAILURE_CACHE_VERSION, cacheTag],
      { revalidate: PHOTO_REFS_FAILURE_BACKOFF_SECONDS }
    )();
    return marker === true;
  } catch (error) {
    if (error instanceof PhotoRefsBackoffProbeMissError) {
      return false;
    }
    throw error;
  }
}

async function markPhotoRefsFailureBackoff(cacheTag: string): Promise<void> {
  await unstable_cache(
    async () => true,
    ["beach-photo-refs-failure", PHOTO_REFS_FAILURE_CACHE_VERSION, cacheTag],
    { revalidate: PHOTO_REFS_FAILURE_BACKOFF_SECONDS }
  )();
}

/**
 * All Google Places photo resource names for a beach (admin gallery + internal slice source).
 * Cache key includes the effective text query (name vs photoSearchName).
 * Only non-empty successful results are cached (7d); retryable failures back off 15m.
 */
export async function getGooglePlacePhotoReferences(beach: BeachPhotoSearchFields): Promise<string[]> {
  const textQuery = placesPhotoTextQuery(beach);
  if (!textQuery.trim()) {
    return [];
  }

  const cacheTag = normalizePhotoQueryCacheKey(textQuery);

  if (await isPhotoRefsBackedOff(cacheTag)) {
    console.warn("[beach-photos] Skipping Places fetch (failure backoff active)", { textQuery });
    return [];
  }

  try {
    return await unstable_cache(
      async () => {
        const refs = await fetchGooglePlacePhotoReferencesForTextQuery(textQuery);
        if (refs.length === 0) {
          throw new BeachPhotoRefsCacheSkipError(
            `Refusing to cache empty photo refs for "${textQuery}"`,
            "no_photos"
          );
        }
        return refs;
      },
      ["beach-photo-refs", PHOTO_REFS_SUCCESS_CACHE_VERSION, cacheTag],
      { revalidate: 604800 }
    )();
  } catch (error) {
    if (error instanceof BeachPhotoRefsRetryableError) {
      await markPhotoRefsFailureBackoff(cacheTag);
    } else if (
      error instanceof Error &&
      !(error instanceof BeachPhotoRefsCacheSkipError) &&
      error.message === "No Google API key configured"
    ) {
      await markPhotoRefsFailureBackoff(cacheTag);
    }

    console.error("[beach-photos] Failed to fetch photo references", {
      textQuery,
      message: error instanceof Error ? error.message : "Unknown error",
      ...(error instanceof BeachPhotoRefsCacheSkipError
        ? { reason: error.reason, cacheSkipped: true }
        : {}),
      ...(error instanceof BeachPhotoRefsRetryableError
        ? { retryable: true, failureBackoffSeconds: PHOTO_REFS_FAILURE_BACKOFF_SECONDS }
        : {})
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

/** Public pages: skip Text Search when a saved override already supplies the hero. */
export async function getBeachPhotoUrlsUnlessOverridden(
  beach: BeachPhotoSearchFields,
  override: BeachPhotoOverrideData | null | undefined
): Promise<string[]> {
  if (overrideProvidesHero(override)) {
    return [];
  }
  return getBeachPhotoUrls(beach);
}
