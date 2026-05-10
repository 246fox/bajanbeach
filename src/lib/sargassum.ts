import type { BeachCoast, SargassumDisplay } from "@/types/beach";
import { createServiceSupabase } from "@/lib/supabase/service";

export type SargassumLevelValue = "low" | "medium" | "high";

export type SargassumRow = {
  coast: string;
  level: SargassumLevelValue;
  updated_at: string;
  notes: string | null;
  source: string | null;
  confidence: number | null;
};

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

const COAST_KEYS: BeachCoast[] = ["North", "West", "South", "Southeast", "East"];

export function isSargassumStale(updatedAtIso: string | null | undefined): boolean {
  if (!updatedAtIso) {
    return true;
  }
  const t = new Date(updatedAtIso).getTime();
  if (Number.isNaN(t)) {
    return true;
  }
  return Date.now() - t > STALE_MS;
}

export function rowToDisplay(row: SargassumRow | null | undefined): SargassumDisplay {
  if (!row || isSargassumStale(row.updated_at)) {
    return { status: "unavailable" };
  }
  return {
    status: "ok",
    level: row.level,
    updatedAt: row.updated_at
  };
}

export async function fetchSargassumByCoast(): Promise<Record<BeachCoast, SargassumRow | null>> {
  const empty = (): Record<BeachCoast, SargassumRow | null> => ({
    North: null,
    West: null,
    South: null,
    Southeast: null,
    East: null
  });

  const supabase = createServiceSupabase();
  if (!supabase) {
    return empty();
  }

  const { data, error } = await supabase.from("sargassum_levels").select("*");
  if (error) {
    console.error("[sargassum] Failed to fetch levels", { message: error.message });
    return empty();
  }

  const map = empty();
  for (const row of data ?? []) {
    const coast = row.coast as BeachCoast;
    if (COAST_KEYS.includes(coast)) {
      map[coast] = row as SargassumRow;
    }
  }
  return map;
}

export async function fetchSargassumRowForCoast(coast: BeachCoast): Promise<SargassumRow | null> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("sargassum_levels")
    .select("*")
    .eq("coast", coast)
    .maybeSingle();

  if (error) {
    console.error("[sargassum] Single-coast fetch failed", { coast, message: error.message });
    return null;
  }
  if (!data) {
    return null;
  }
  return data as SargassumRow;
}
