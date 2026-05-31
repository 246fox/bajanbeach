import type { BeachConditions } from "@/types/beach";
import { createServiceSupabase } from "@/lib/supabase/service";

/** Max age of a cached reading (from `last_updated_at`) before we treat it as unusable. */
export const CONDITIONS_MAX_STALENESS_MS = 12 * 60 * 60 * 1000;

type CacheRow = {
  beach_slug: string;
  wave_height: number | null;
  wave_period: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  swim_score: number | null;
  last_updated_at: string | null;
};

function rowToConditions(row: CacheRow): BeachConditions | null {
  if (!row.last_updated_at) {
    return null;
  }
  const readingMs = Date.parse(row.last_updated_at);
  if (Number.isNaN(readingMs)) {
    return null;
  }
  if (Date.now() - readingMs > CONDITIONS_MAX_STALENESS_MS) {
    return null;
  }

  return {
    waveHeight: row.wave_height,
    wavePeriod: row.wave_period,
    windSpeed: row.wind_speed,
    windDirection: row.wind_direction,
    swimScore: row.swim_score,
    lastUpdatedAt: row.last_updated_at
  };
}

/**
 * Returns cached conditions if fresh enough, else null. Never throws.
 */
export async function readBeachConditionsFromCache(beachSlug: string): Promise<BeachConditions | null> {
  try {
    const supabase = createServiceSupabase();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("beach_conditions_cache")
      .select(
        "beach_slug, wave_height, wave_period, wind_speed, wind_direction, swim_score, last_updated_at"
      )
      .eq("beach_slug", beachSlug)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[beach-conditions-cache] read failed", { beachSlug, message: error.message });
      }
      return null;
    }

    return rowToConditions(data as CacheRow);
  } catch (e) {
    console.error("[beach-conditions-cache] read threw", {
      beachSlug,
      message: e instanceof Error ? e.message : "Unknown error"
    });
    return null;
  }
}

/**
 * Upserts live conditions into cache. Swallows all errors — caller's return must not depend on success.
 */
export async function upsertBeachConditionsCache(
  beachSlug: string,
  conditions: BeachConditions
): Promise<void> {
  try {
    const supabase = createServiceSupabase();
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("beach_conditions_cache").upsert(
      {
        beach_slug: beachSlug,
        wave_height: conditions.waveHeight,
        wave_period: conditions.wavePeriod,
        wind_speed: conditions.windSpeed,
        wind_direction: conditions.windDirection,
        swim_score: conditions.swimScore,
        last_updated_at: conditions.lastUpdatedAt
      },
      { onConflict: "beach_slug" }
    );

    if (error) {
      console.error("[beach-conditions-cache] upsert failed", { beachSlug, message: error.message });
    }
  } catch (e) {
    console.error("[beach-conditions-cache] upsert threw", {
      beachSlug,
      message: e instanceof Error ? e.message : "Unknown error"
    });
  }
}
