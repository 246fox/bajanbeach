"use server";

import { fetchBeachConditions } from "@/lib/beach-conditions";
import { getBeachBySlug } from "@/data/beaches";

export type LiveConditionsResult =
  | {
      ok: true;
      waveHeight: number | null;
      wavePeriod: number | null;
      windSpeed: number | null;
      windDirection: number | null;
    }
  | { ok: false; error: string };

/** Open-Meteo fetch only; sargassum stays manual in the lab. */
export async function loadLiveBeachConditions(slug: string): Promise<LiveConditionsResult> {
  const beach = getBeachBySlug(slug);
  if (!beach) {
    return { ok: false, error: "Unknown beach slug." };
  }
  try {
    const c = await fetchBeachConditions(beach, { sargassumLevel: null });
    return {
      ok: true,
      waveHeight: c.waveHeight,
      wavePeriod: c.wavePeriod,
      windSpeed: c.windSpeed,
      windDirection: c.windDirection
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load conditions."
    };
  }
}
