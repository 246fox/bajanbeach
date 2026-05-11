import type { SargassumLevelForScore } from "@/lib/sargassum";
import type { Beach, BeachConditions } from "@/types/beach";

type WeatherResponse = {
  current_weather?: {
    windspeed?: number;
    winddirection?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    windspeed_10m?: number[];
    winddirection_10m?: number[];
  };
};

type MarineResponse = {
  current?: {
    wave_height?: number;
    wave_period?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    wave_height?: number[];
    wave_period?: number[];
  };
};

async function safeReadBodySnippet(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    return text.slice(0, 500);
  } catch {
    return null;
  }
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundBeachScore(value: number): number {
  return Math.round(clampToRange(value, 1, 10));
}

function angularDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** Meteorological wind FROM (degrees). Offshore/onshore within ±60° of opposite / same as coast facing. */
export function windDirectionModifier(coast: Beach["coast"], windDirection: number | null): number {
  if (windDirection === null || Number.isNaN(windDirection)) {
    return 0;
  }
  const w = ((windDirection % 360) + 360) % 360;

  const coastFacingDeg: Record<Beach["coast"], number> = {
    North: 0,
    East: 90,
    South: 180,
    Southeast: 135,
    West: 270
  };

  const face = coastFacingDeg[coast];
  const offshoreBearing = (face + 180) % 360;
  const onshoreBearing = face;

  if (angularDiffDeg(w, offshoreBearing) <= 60) {
    return 0.5;
  }
  if (angularDiffDeg(w, onshoreBearing) <= 60) {
    return -1.0;
  }
  return 0;
}

function sargassumSwimPenalty(type: Beach["type"], level: SargassumLevelForScore): number {
  if (type === "surf") {
    return 0;
  }
  if (level === "medium") {
    return -1.5;
  }
  if (level === "high") {
    return -3.0;
  }
  return 0;
}

function periodModifierSwimBeaches(
  swellTolerance: Beach["swellTolerance"],
  wavePeriod: number | null
): number {
  if (swellTolerance === "high") {
    return 0;
  }
  if (wavePeriod === null || Number.isNaN(wavePeriod)) {
    return 0;
  }
  if (wavePeriod >= 8) {
    return 0.3;
  }
  if (wavePeriod < 5) {
    return -0.5;
  }
  return 0;
}

function periodModifierHighTolerance(wavePeriod: number | null): number {
  if (wavePeriod === null || Number.isNaN(wavePeriod)) {
    return 0;
  }
  if (wavePeriod >= 10) {
    return 2.5;
  }
  if (wavePeriod >= 8) {
    return 1.8;
  }
  if (wavePeriod >= 6) {
    return 0.4;
  }
  return -0.9;
}

function applyTypeToleranceFloorsCeilings(
  beach: Pick<Beach, "slug" | "type" | "swellTolerance">,
  waveHeight: number | null,
  score: number
): number {
  if (beach.type === "surf") {
    return score;
  }

  let s = score;

  if (beach.type === "calm" && beach.swellTolerance === "low") {
    if (waveHeight !== null && waveHeight < 1.5 && s < 7) {
      const before = s;
      s = 7;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "floor_7_calm_low_lt_1_5m",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    if (s > 10) {
      const before = s;
      s = 10;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "ceiling_10_calm_low",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    return s;
  }

  if (beach.type === "moderate" && beach.swellTolerance === "medium") {
    if (waveHeight !== null && waveHeight < 2.0 && s < 5) {
      const before = s;
      s = 5;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "floor_5_moderate_medium_lt_2m",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    if (s > 9) {
      const before = s;
      s = 9;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "ceiling_9_moderate_medium",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    return s;
  }

  if (beach.type === "moderate" && beach.swellTolerance === "high") {
    if (waveHeight !== null && waveHeight < 2.0 && s < 4) {
      const before = s;
      s = 4;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "floor_4_moderate_high_lt_2m",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    if (s > 8) {
      const before = s;
      s = 8;
      console.log("[scoring]", {
        beachSlug: beach.slug,
        rule: "ceiling_8_moderate_high",
        scoreBeforeFloorCeiling: before,
        finalAfterFloorCeiling: s
      });
    }
    return s;
  }

  return s;
}

function computeBeachScore(
  beach: Pick<Beach, "slug" | "type" | "swellTolerance" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore
): number | null {
  if (waveHeight === null || windSpeed === null) {
    return null;
  }

  let score: number;

  if (beach.swellTolerance === "low") {
    score = 9.5;
    if (waveHeight > 0.8) {
      const penalty = Math.min((waveHeight - 0.8) ** 2 * 8, 7);
      score -= penalty;
    }
    score += periodModifierSwimBeaches("low", wavePeriod);
    score += windDirectionModifier(beach.coast, windDirection);
    if (windSpeed > 25 && windSpeed <= 30) {
      score -= 1;
    } else if (windSpeed > 30 && windSpeed <= 35) {
      score -= 1.5;
    } else if (windSpeed > 35) {
      score -= 2;
    }
    score += sargassumSwimPenalty(beach.type, sargassumLevel);
  } else if (beach.swellTolerance === "medium") {
    score = 7.5;
    if (waveHeight > 1.25) {
      const penalty = Math.min((waveHeight - 1.25) ** 2 * 4, 5);
      score -= penalty;
    }
    score += periodModifierSwimBeaches("medium", wavePeriod);
    score += windDirectionModifier(beach.coast, windDirection);
    if (windSpeed > 30 && windSpeed <= 35) {
      score -= 1;
    } else if (windSpeed > 35 && windSpeed <= 40) {
      score -= 1.5;
    } else if (windSpeed > 40) {
      score -= 2;
    }
    score += sargassumSwimPenalty(beach.type, sargassumLevel);
  } else {
    score = 5.5;
    if (waveHeight < 0.55) {
      score -= 1.2;
    } else if (waveHeight <= 3.0) {
      score += (waveHeight - 0.55) * 1.35;
    } else if (waveHeight <= 4.2) {
      score += 2.5;
    } else {
      score -= 0.8;
    }
    score += periodModifierHighTolerance(wavePeriod);
    score += windDirectionModifier(beach.coast, windDirection);
    if (windSpeed > 35 && windSpeed <= 45) {
      score -= 0.5;
    } else if (windSpeed > 45) {
      score -= 1;
    }
    score += sargassumSwimPenalty(beach.type, sargassumLevel);
  }

  score = applyTypeToleranceFloorsCeilings(beach, waveHeight, score);

  return roundBeachScore(score);
}

export type FetchBeachConditionsOptions = {
  sargassumLevel?: SargassumLevelForScore;
};

export function parseOpenMeteoTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  // Open-Meteo with `timezone=auto` returns Barbados-local timestamps with
  // NO timezone offset, e.g. "2026-05-08T22:30". `Date.parse` would then
  // interpret them in the host machine's timezone — fine on a localhost in
  // AST, but on Vercel (UTC) the value lands 4 hours ahead. Barbados does
  // not observe DST, so we can safely pin missing offsets to -04:00.
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  let normalized = value;
  if (!hasTimezone) {
    const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(value);
    normalized = `${value}${hasSeconds ? "" : ":00"}-04:00`;
  }
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function fetchBeachConditions(
  beach: Beach,
  options?: FetchBeachConditionsOptions
): Promise<BeachConditions> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${beach.latitude}&longitude=${beach.longitude}` +
    "&current_weather=true&hourly=windspeed_10m,winddirection_10m&timezone=auto";

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${beach.latitude}&longitude=${beach.longitude}` +
    "&current=wave_height,wave_period&hourly=wave_height,wave_period&timezone=auto";

  try {
    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl, { next: { revalidate: 3600 } }),
      fetch(marineUrl, { next: { revalidate: 3600 } })
    ]);

    if (!weatherResponse.ok || !marineResponse.ok) {
      const weatherErrorBody = weatherResponse.ok ? null : await safeReadBodySnippet(weatherResponse);
      const marineErrorBody = marineResponse.ok ? null : await safeReadBodySnippet(marineResponse);
      console.error("[beach-conditions] Open-Meteo request failed", {
        beachSlug: beach.slug,
        beachName: beach.name,
        weatherStatus: weatherResponse.status,
        weatherStatusText: weatherResponse.statusText,
        weatherErrorBody,
        marineStatus: marineResponse.status,
        marineStatusText: marineResponse.statusText,
        marineErrorBody
      });
      throw new Error("Failed to fetch one or more APIs");
    }

    const weatherData = (await weatherResponse.json()) as WeatherResponse;
    const marineData = (await marineResponse.json()) as MarineResponse;

    const windSpeed =
      weatherData.current_weather?.windspeed ?? weatherData.hourly?.windspeed_10m?.[0] ?? null;
    const windDirection =
      weatherData.current_weather?.winddirection ??
      weatherData.hourly?.winddirection_10m?.[0] ??
      null;
    const waveHeight = marineData.current?.wave_height ?? marineData.hourly?.wave_height?.[0] ?? null;
    const wavePeriod = marineData.current?.wave_period ?? marineData.hourly?.wave_period?.[0] ?? null;
    const windTimestamp = parseOpenMeteoTimestamp(
      weatherData.current_weather?.time ?? weatherData.hourly?.time?.[0]
    );
    const waveTimestamp = parseOpenMeteoTimestamp(
      marineData.current?.time ?? marineData.hourly?.time?.[0]
    );
    const combinedTimestamp =
      windTimestamp !== null && waveTimestamp !== null
        ? Math.min(windTimestamp, waveTimestamp)
        : windTimestamp ?? waveTimestamp;

    if (waveHeight === null || windSpeed === null) {
      console.warn("[beach-conditions] Missing score inputs from Open-Meteo response", {
        beachSlug: beach.slug,
        beachName: beach.name,
        waveHeight,
        wavePeriod,
        windSpeed,
        windDirection,
        weatherHasCurrent: Boolean(weatherData.current_weather),
        marineHasCurrent: Boolean(marineData.current),
        weatherHourlyCount: weatherData.hourly?.time?.length ?? 0,
        marineHourlyCount: marineData.hourly?.time?.length ?? 0
      });
    }

    return {
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      swimScore: computeBeachScore(
        beach,
        waveHeight,
        wavePeriod,
        windSpeed,
        windDirection,
        options?.sargassumLevel ?? null
      ),
      lastUpdatedAt: combinedTimestamp !== null ? new Date(combinedTimestamp).toISOString() : null
    };
  } catch (error) {
    console.error("[beach-conditions] Failed to build beach conditions", {
      beachSlug: beach.slug,
      beachName: beach.name,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return {
      waveHeight: null,
      wavePeriod: null,
      windSpeed: null,
      windDirection: null,
      swimScore: null,
      lastUpdatedAt: null
    };
  }
}
