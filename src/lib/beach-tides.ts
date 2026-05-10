import type { Beach, BeachTides, TidePhase } from "@/types/beach";
import { parseOpenMeteoTimestamp } from "@/lib/beach-conditions";

const OPEN_METEO_MARINE = "https://marine-api.open-meteo.com/v1/marine";
const TIDE_REVALIDATE_SECONDS = 6 * 60 * 60;
const EPS_M = 0.0005;

type MarineHourlyTide = {
  hourly?: {
    time?: string[];
    sea_level_height_msl?: (number | null)[];
  };
};

async function safeReadBodySnippet(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text ? text.slice(0, 400) : null;
  } catch {
    return null;
  }
}

function buildSeries(data: MarineHourlyTide): { timesMs: number[]; levels: number[] } {
  const times = data.hourly?.time ?? [];
  const raw = data.hourly?.sea_level_height_msl ?? [];
  const timesMs: number[] = [];
  const levels: number[] = [];

  for (let i = 0; i < Math.min(times.length, raw.length); i++) {
    const t = parseOpenMeteoTimestamp(times[i]);
    const v = raw[i];
    if (t === null || v === null || Number.isNaN(v)) {
      continue;
    }
    timesMs.push(t);
    levels.push(v);
  }

  return { timesMs, levels };
}

function findCurrentIndex(timesMs: number[], nowMs: number): number {
  let idx = 0;
  for (let i = 0; i < timesMs.length; i++) {
    if (timesMs[i] <= nowMs) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

function isPeak(levels: number[], j: number): boolean {
  if (j <= 0 || j >= levels.length - 1) {
    return false;
  }
  return levels[j] > levels[j - 1] && levels[j] > levels[j + 1];
}

function isTrough(levels: number[], j: number): boolean {
  if (j <= 0 || j >= levels.length - 1) {
    return false;
  }
  return levels[j] < levels[j - 1] && levels[j] < levels[j + 1];
}

function classifyPhase(levels: number[], i: number): TidePhase | null {
  const n = levels.length;
  if (n < 2 || i < 0 || i >= n) {
    return null;
  }

  if (i > 0 && i < n - 1) {
    if (isPeak(levels, i)) {
      return "high";
    }
    if (isTrough(levels, i)) {
      return "low";
    }
  }

  if (i < n - 1) {
    const delta = levels[i + 1] - levels[i];
    if (delta > EPS_M) {
      return "rising";
    }
    if (delta < -EPS_M) {
      return "falling";
    }
  }

  if (i > 0) {
    const delta = levels[i] - levels[i - 1];
    if (delta > EPS_M) {
      return "rising";
    }
    if (delta < -EPS_M) {
      return "falling";
    }
  }

  return null;
}

function nextExtremeAfter(
  timesMs: number[],
  levels: number[],
  nowMs: number,
  pickPeak: boolean
): { atMs: number; heightM: number } | null {
  let bestMs: number | null = null;
  let bestHeight = 0;

  for (let j = 1; j < levels.length - 1; j++) {
    const t = timesMs[j];
    if (t <= nowMs) {
      continue;
    }
    const ok = pickPeak ? isPeak(levels, j) : isTrough(levels, j);
    if (!ok) {
      continue;
    }
    if (bestMs === null || t < bestMs) {
      bestMs = t;
      bestHeight = levels[j];
    }
  }

  if (bestMs === null) {
    return null;
  }
  return { atMs: bestMs, heightM: bestHeight };
}

const EMPTY_TIDES: BeachTides = {
  phase: null,
  nextHighAt: null,
  nextHighHeightM: null,
  nextLowAt: null,
  nextLowHeightM: null
};

export async function fetchBeachTides(beach: Beach): Promise<BeachTides> {
  const params = new URLSearchParams({
    latitude: String(beach.latitude),
    longitude: String(beach.longitude),
    hourly: "sea_level_height_msl",
    forecast_days: "5",
    timezone: "auto"
  });

  const url = `${OPEN_METEO_MARINE}?${params.toString()}`;

  try {
    const response = await fetch(url, { next: { revalidate: TIDE_REVALIDATE_SECONDS } });

    if (!response.ok) {
      const body = await safeReadBodySnippet(response);
      console.error("[beach-tides] Open-Meteo marine tide request failed", {
        beachSlug: beach.slug,
        beachName: beach.name,
        status: response.status,
        statusText: response.statusText,
        body
      });
      return { ...EMPTY_TIDES };
    }

    const data = (await response.json()) as MarineHourlyTide;
    const { timesMs, levels } = buildSeries(data);

    if (timesMs.length < 3 || levels.length < 3) {
      console.warn("[beach-tides] Insufficient tide hourly data", {
        beachSlug: beach.slug,
        beachName: beach.name,
        pointCount: levels.length
      });
      return { ...EMPTY_TIDES };
    }

    const nowMs = Date.now();
    const i = findCurrentIndex(timesMs, nowMs);
    const phase = classifyPhase(levels, i);

    const nextHigh = nextExtremeAfter(timesMs, levels, nowMs, true);
    const nextLow = nextExtremeAfter(timesMs, levels, nowMs, false);

    return {
      phase,
      nextHighAt: nextHigh ? new Date(nextHigh.atMs).toISOString() : null,
      nextHighHeightM: nextHigh ? nextHigh.heightM : null,
      nextLowAt: nextLow ? new Date(nextLow.atMs).toISOString() : null,
      nextLowHeightM: nextLow ? nextLow.heightM : null
    };
  } catch (error) {
    console.error("[beach-tides] Failed to fetch tides", {
      beachSlug: beach.slug,
      beachName: beach.name,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return { ...EMPTY_TIDES };
  }
}
