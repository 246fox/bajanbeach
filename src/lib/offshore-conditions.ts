import { OFFSHORE_POINTS } from "@/lib/offshore-points";

export type OffshoreConditionRow = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  waveHeight: number | null;
  swellWaveHeight: number | null;
  swellWavePeriod: number | null;
  swellWaveDirection: number | null;
  seaSurfaceTemperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  weatherCode: number | null;
};

export type OffshoreConditionsResult = OffshoreConditionRow[];

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

function nullRows(): OffshoreConditionsResult {
  return OFFSHORE_POINTS.map((p) => ({
    id: p.id,
    label: p.label,
    latitude: p.latitude,
    longitude: p.longitude,
    waveHeight: null,
    swellWaveHeight: null,
    swellWavePeriod: null,
    swellWaveDirection: null,
    seaSurfaceTemperature: null,
    windSpeed: null,
    windDirection: null,
    weatherCode: null
  }));
}

type MarineStation = {
  current?: {
    wave_height?: number;
    swell_wave_height?: number;
    swell_wave_period?: number;
    swell_wave_direction?: number;
    sea_surface_temperature?: number;
  };
};

type ForecastStation = {
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    weather_code?: number;
  };
};

function isMarineStationsArray(data: unknown, expectedN: number): data is MarineStation[] {
  return Array.isArray(data) && data.length === expectedN;
}

function isForecastStationsArray(data: unknown, expectedN: number): data is ForecastStation[] {
  return Array.isArray(data) && data.length === expectedN;
}

/**
 * Fetches open-ocean conditions at OFFSHORE_POINTS (one marine + one forecast call).
 * Never throws — returns null-filled rows on any failure or unexpected response shape.
 */
export async function fetchOffshoreConditions(): Promise<OffshoreConditionsResult> {
  const expectedN = OFFSHORE_POINTS.length;
  const latParam = OFFSHORE_POINTS.map((p) => p.latitude).join(",");
  const lngParam = OFFSHORE_POINTS.map((p) => p.longitude).join(",");

  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latParam}&longitude=${lngParam}` +
    "&current=wave_height,swell_wave_height,swell_wave_period,swell_wave_direction,sea_surface_temperature&timezone=auto";

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latParam}&longitude=${lngParam}` +
    "&current=wind_speed_10m,wind_direction_10m,weather_code&timezone=auto";

  try {
    const [marineResponse, forecastResponse] = await Promise.all([
      fetch(marineUrl, { next: { revalidate: 3600 } }),
      fetch(forecastUrl, { next: { revalidate: 3600 } })
    ]);

    if (!marineResponse.ok || !forecastResponse.ok) {
      const marineErrorBody = marineResponse.ok ? null : await safeReadBodySnippet(marineResponse);
      const forecastErrorBody = forecastResponse.ok ? null : await safeReadBodySnippet(forecastResponse);
      console.error("[offshore-conditions] Open-Meteo request failed", {
        marineStatus: marineResponse.status,
        marineStatusText: marineResponse.statusText,
        marineErrorBody,
        forecastStatus: forecastResponse.status,
        forecastStatusText: forecastResponse.statusText,
        forecastErrorBody
      });
      return nullRows();
    }

    const marineJson: unknown = await marineResponse.json();
    const forecastJson: unknown = await forecastResponse.json();

    if (!isMarineStationsArray(marineJson, expectedN) || !isForecastStationsArray(forecastJson, expectedN)) {
      console.error("[offshore-conditions] Unexpected response shape (marine/forecast array length mismatch)", {
        expectedN,
        marineIsArray: Array.isArray(marineJson),
        marineLength: Array.isArray(marineJson) ? marineJson.length : null,
        forecastIsArray: Array.isArray(forecastJson),
        forecastLength: Array.isArray(forecastJson) ? forecastJson.length : null
      });
      return nullRows();
    }

    return OFFSHORE_POINTS.map((p, i) => {
      const mc = marineJson[i]?.current;
      const fc = forecastJson[i]?.current;
      return {
        id: p.id,
        label: p.label,
        latitude: p.latitude,
        longitude: p.longitude,
        waveHeight: mc?.wave_height ?? null,
        swellWaveHeight: mc?.swell_wave_height ?? null,
        swellWavePeriod: mc?.swell_wave_period ?? null,
        swellWaveDirection: mc?.swell_wave_direction ?? null,
        seaSurfaceTemperature: mc?.sea_surface_temperature ?? null,
        windSpeed: fc?.wind_speed_10m ?? null,
        windDirection: fc?.wind_direction_10m ?? null,
        weatherCode: fc?.weather_code ?? null
      };
    });
  } catch (error) {
    console.error("[offshore-conditions] Failed to fetch offshore conditions", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return nullRows();
  }
}
