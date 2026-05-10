type CacheEntry = {
  photoUrls: string[];
  fetchedAt: number;
};

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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const beachPhotoCache = new Map<string, CacheEntry>();

function normalizeBeachName(name: string): string {
  return name.trim().toLowerCase();
}

function buildPhotoUrl(photoReference: string, apiKey: string): string {
  const params = new URLSearchParams({
    maxHeightPx: "800",
    key: apiKey
  });
  return `https://places.googleapis.com/v1/${photoReference}/media?${params.toString()}`;
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
  beachName: string,
  details: {
    httpStatus: number;
    apiCode: number | null;
    apiStatus: string | null;
    apiMessage: string | null;
  }
) {
  console.error("[beach-photos] Google Places request failed", {
    stage,
    beachName,
    httpStatus: details.httpStatus,
    apiCode: details.apiCode,
    apiStatus: details.apiStatus,
    apiMessage: details.apiMessage
  });
}

export async function getBeachPhotoUrls(beachName: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return [];
  }

  const trimmed = beachName.trim();
  if (!trimmed) {
    return [];
  }

  const cacheKey = normalizeBeachName(trimmed);
  const now = Date.now();
  const cached = beachPhotoCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.photoUrls;
  }

  try {
    const textSearchResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.photos"
        },
        body: JSON.stringify({
          textQuery: `${trimmed} Barbados`
        }),
        next: { revalidate: 3600 }
      }
    );

    if (!textSearchResponse.ok) {
      const errorDetails = await readGoogleError(textSearchResponse);
      logPlacesFailure("text-search", trimmed, errorDetails);
      throw new Error("Text Search request failed");
    }

    const textSearchData = (await textSearchResponse.json()) as TextSearchResponse;
    const placeId = textSearchData.places?.[0]?.id;
    if (!placeId) {
      beachPhotoCache.set(cacheKey, { photoUrls: [], fetchedAt: now });
      return [];
    }

    const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos"
      },
      next: { revalidate: 3600 }
    });

    if (!detailsResponse.ok) {
      const errorDetails = await readGoogleError(detailsResponse);
      logPlacesFailure("place-details", trimmed, errorDetails);
      throw new Error("Place Details request failed");
    }

    const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse;
    const photoUrls = (detailsData.photos ?? [])
      .map((photo) => photo.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 5)
      .map((photoName) => buildPhotoUrl(photoName, apiKey));

    beachPhotoCache.set(cacheKey, { photoUrls, fetchedAt: now });
    return photoUrls;
  } catch (error) {
    console.error("[beach-photos] Failed to fetch beach photos", {
      beachName: trimmed,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return [];
  }
}
