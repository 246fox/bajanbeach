"use server";

import { fetchBeachConditions } from "@/lib/beach-conditions";
import { getBeachBySlug } from "@/data/beaches";
import {
  fetchSargassumByCoast,
  isSargassumStale,
  sargassumLevelForScoring,
  type SargassumLevelForScore
} from "@/lib/sargassum";
import { createServiceSupabase } from "@/lib/supabase/service";
import type { BeachCoast } from "@/types/beach";

const COAST_KEYS: BeachCoast[] = ["North", "West", "South", "Southeast", "East"];

export type CoastSargassumMeta = {
  coast: BeachCoast;
  levelForScore: SargassumLevelForScore;
  status: "ok" | "stale" | "missing";
  updatedAt: string | null;
  rowLevel: string | null;
};

export type LoadSargassumLevelsResult =
  | {
      ok: true;
      source: "supabase";
      byCoast: Record<BeachCoast, SargassumLevelForScore>;
      meta: Record<BeachCoast, CoastSargassumMeta>;
    }
  | { ok: true; source: "manual"; reason: string }
  | { ok: false; error: string };

export type LiveConditionsResult =
  | {
      ok: true;
      waveHeight: number | null;
      wavePeriod: number | null;
      windSpeed: number | null;
      windDirection: number | null;
    }
  | { ok: false; error: string };

/** Production path: Supabase `sargassum_levels` → `sargassumLevelForScoring` per coast. */
export async function loadSargassumLevelsForLab(): Promise<LoadSargassumLevelsResult> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return {
      ok: true,
      source: "manual",
      reason: "Supabase credentials not configured — enter per-coast levels manually."
    };
  }

  try {
    const rows = await fetchSargassumByCoast();
    const byCoast = {} as Record<BeachCoast, SargassumLevelForScore>;
    const meta = {} as Record<BeachCoast, CoastSargassumMeta>;

    for (const coast of COAST_KEYS) {
      const row = rows[coast];
      const levelForScore = sargassumLevelForScoring(row);
      let status: CoastSargassumMeta["status"];
      if (!row) {
        status = "missing";
      } else if (isSargassumStale(row.updated_at)) {
        status = "stale";
      } else {
        status = "ok";
      }
      byCoast[coast] = levelForScore;
      meta[coast] = {
        coast,
        levelForScore,
        status,
        updatedAt: row?.updated_at ?? null,
        rowLevel: row?.level ?? null
      };
    }

    return { ok: true, source: "supabase", byCoast, meta };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load sargassum levels."
    };
  }
}

/** Open-Meteo fetch only; sargassum is resolved separately in the lab UI. */
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
