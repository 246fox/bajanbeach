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
  } catch {
    return [];
  }
}
