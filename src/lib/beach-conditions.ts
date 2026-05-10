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

function computeBeachScore(
  swellTolerance: Beach["swellTolerance"],
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null
): number | null {
  if (waveHeight === null || windSpeed === null) {
    return null;
  }

  if (swellTolerance === "low") {
    let score = 9;

    if (waveHeight <= 0.8) score += 0.2;
    else if (waveHeight <= 1.0) score += 0;
    else if (waveHeight <= 1.25) score -= 3;
    else if (waveHeight <= 1.5) score -= 4.5;
    else if (waveHeight <= 2.0) score -= 6;
    else score -= 7.5;

    if (windSpeed > 25 && windSpeed <= 30) score -= 1;
    else if (windSpeed > 30 && windSpeed <= 35) score -= 1.5;
    else if (windSpeed > 35) score -= 2;

    return roundBeachScore(score);
  }

  if (swellTolerance === "medium") {
    let score = 7;

    if (waveHeight <= 0.8) score += 0.5;
    else if (waveHeight <= 1.25) score += 0.25;
    else if (waveHeight <= 1.5) score += 0;
    else if (waveHeight <= 2.0) score -= 2;
    else if (waveHeight <= 2.5) score -= 3.5;
    else score -= 5;

    if (windSpeed > 30 && windSpeed <= 35) score -= 1;
    else if (windSpeed > 35 && windSpeed <= 40) score -= 1.5;
    else if (windSpeed > 40) score -= 2;

    return roundBeachScore(score);
  }

  let score = 4;

  if (waveHeight < 0.55) score -= 1.2;
  else if (waveHeight <= 3.0) {
    score += (waveHeight - 0.55) * 1.35;
  } else if (waveHeight <= 4.2) {
    score += 2.5;
  } else {
    score -= 0.8;
  }

  if (wavePeriod !== null) {
    if (wavePeriod >= 10) score += 2.5;
    else if (wavePeriod >= 8) score += 1.8;
    else if (wavePeriod >= 6) score += 0.4;
    else score -= 0.9;
  }

  if (windSpeed > 35 && windSpeed <= 45) score -= 0.5;
  else if (windSpeed > 45) score -= 1;

  return roundBeachScore(score);
}

function parseOpenMeteoTimestamp(value: string | null | undefined): number | null {
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

export async function fetchBeachConditions(beach: Beach): Promise<BeachConditions> {
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
      swimScore: computeBeachScore(beach.swellTolerance, waveHeight, wavePeriod, windSpeed),
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
