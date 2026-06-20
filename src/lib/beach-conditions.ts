import type { SargassumLevelForScore } from "@/lib/sargassum";
import {
  readBeachConditionsFromCache,
  upsertBeachConditionsCache
} from "@/lib/beach-conditions-cache";
import { openMeteoFetch } from "@/lib/open-meteo-fetch";
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

/** Stepped high-wind safety ceiling — applied last, after [1, 10] clamp, before round. */
export const HIGH_WIND_SAFETY_CAP = {
  /** Sustained wind below this (km/h) — no safety cap. */
  noCapBelowKmh: 50,
  /** Bands in ascending minKmh; each applies when minKmh ≤ wind ≤ maxKmh. */
  bands: [
    { minKmh: 50, maxKmh: 61, cap: 4, label: "high wind" },
    { minKmh: 62, maxKmh: 74, cap: 3, label: "gale" },
    { minKmh: 75, maxKmh: 88, cap: 2, label: "storm force" },
    { minKmh: 89, maxKmh: Number.POSITIVE_INFINITY, cap: 1, label: "hurricane force" }
  ] as const
} as const;

type HighWindSafetyCapBand = (typeof HIGH_WIND_SAFETY_CAP.bands)[number];

function highWindSafetyCapBand(windSpeed: number): HighWindSafetyCapBand | null {
  if (windSpeed < HIGH_WIND_SAFETY_CAP.noCapBelowKmh) {
    return null;
  }
  for (const band of HIGH_WIND_SAFETY_CAP.bands) {
    if (windSpeed >= band.minKmh && windSpeed <= band.maxKmh) {
      return band;
    }
  }
  return null;
}

function highWindSafetyCapBandRangeLabel(band: HighWindSafetyCapBand): string {
  if (!Number.isFinite(band.maxKmh)) {
    return `${band.minKmh}+ km/h`;
  }
  return `${band.minKmh}–${band.maxKmh} km/h`;
}

function finalizeClampedScore(
  beachSlug: string,
  clamped: number,
  windSpeed: number,
  logScoring: ScoringLogFn | null,
  push: ((step: Omit<BeachScoreStep, "order">) => void) | null
): number {
  let score = clamped;
  const band = highWindSafetyCapBand(windSpeed);
  if (band !== null) {
    const capped = Math.min(score, band.cap);
    if (capped < score) {
      const before = score;
      score = capped;
      if (logScoring) {
        logScoring({
          beachSlug,
          rule: "high_wind_safety_cap",
          windSpeedKmh: windSpeed,
          bandLabel: band.label,
          cap: band.cap,
          scoreBeforeCap: before,
          finalAfterCap: score
        });
      }
      push?.({
        kind: "wind_safety_cap",
        title: `Wind ${windSpeed} km/h (${band.label}) — score capped at ${band.cap} (high-wind safety).`,
        detail: `High-wind safety cap (${highWindSafetyCapBandRangeLabel(band)} band). Score ${before.toFixed(4)} lowered to ${band.cap}; wind direction does not affect this cap.`,
        valueBefore: before,
        valueAfter: score,
        delta: score - before
      });
    }
  }

  const finalRounded = Math.round(score);
  if (finalRounded !== score) {
    push?.({
      kind: "round",
      title: "Round to integer score",
      detail: `Rounded ${score.toFixed(4)} to nearest integer.`,
      valueBefore: score,
      valueAfter: finalRounded,
      delta: finalRounded - score
    });
  } else {
    push?.({
      kind: "round",
      title: "Round to integer score",
      detail: "Value already an integer — no rounding change.",
      valueBefore: score,
      valueAfter: finalRounded,
      delta: 0
    });
  }

  return finalRounded;
}

function roundBeachScore(value: number): number {
  return Math.round(clampToRange(value, 1, 10));
}

function angularDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

const coastFacingDeg: Record<Beach["coast"], number> = {
  North: 0,
  East: 90,
  South: 180,
  Southeast: 135,
  West: 270
};

export type WindDirectionRelation = {
  modifier: number;
  category: "offshore" | "onshore" | "neutral" | "unknown";
  /** Human-readable line for score lab / explain */
  summary: string;
};

/**
 * Meteorological wind FROM (degrees). Offshore/onshore within ±60° of opposite / same as coast facing.
 * Single source of truth for modifier + lab copy text.
 */
export function windDirectionRelation(
  coast: Beach["coast"],
  windDirection: number | null
): WindDirectionRelation {
  if (windDirection === null || Number.isNaN(windDirection)) {
    return {
      modifier: 0,
      category: "unknown",
      summary: "Wind direction missing or NaN — neutral (no directional adjustment)."
    };
  }
  const w = ((windDirection % 360) + 360) % 360;
  const face = coastFacingDeg[coast];
  const offshoreBearing = (face + 180) % 360;
  const onshoreBearing = face;

  if (angularDiffDeg(w, offshoreBearing) <= 60) {
    return {
      modifier: 0.5,
      category: "offshore",
      summary: `Offshore wind (within ±60° of offshore bearing ${offshoreBearing}° for ${coast}-facing coast) — +0.5.`
    };
  }
  if (angularDiffDeg(w, onshoreBearing) <= 60) {
    return {
      modifier: -1.0,
      category: "onshore",
      summary: `Onshore wind (within ±60° of onshore bearing ${onshoreBearing}° for ${coast}-facing coast) — −1.0.`
    };
  }
  return {
    modifier: 0,
    category: "neutral",
    summary: `Neither offshore (${offshoreBearing}°) nor onshore (${onshoreBearing}°) within ±60° — neutral (0).`
  };
}

export function windDirectionModifier(coast: Beach["coast"], windDirection: number | null): number {
  return windDirectionRelation(coast, windDirection).modifier;
}

function sargassumRoughPenalty(level: SargassumLevelForScore): number {
  if (level === "medium") {
    return -1.0;
  }
  if (level === "high") {
    return -2.0;
  }
  return 0;
}

function sargassumSwimPenalty(seaState: Beach["seaState"], level: SargassumLevelForScore): number {
  if (level === "medium") {
    return -1.5;
  }
  if (level === "high") {
    return -3.0;
  }
  return 0;
}

function periodModifierSwimBeaches(
  waveActionBaseline: Beach["waveActionBaseline"],
  wavePeriod: number | null
): number {
  if (waveActionBaseline === "high") {
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

/** Type-tolerance swim floor (wave < 2 m) — steps down with worse coast sargassum. */
function swimToleranceFloor(
  beach: Pick<Beach, "seaState" | "waveActionBaseline">,
  sargassumLevel: SargassumLevelForScore
): number | null {
  const tier =
    sargassumLevel === "high" ? "high" : sargassumLevel === "medium" ? "medium" : "low";

  if (beach.seaState === "calm" && beach.waveActionBaseline === "low") {
    if (tier === "high") return 4;
    if (tier === "medium") return 5;
    return 7;
  }
  if (beach.seaState === "moderate" && beach.waveActionBaseline === "medium") {
    if (tier === "high") return 3;
    if (tier === "medium") return 4;
    return 5;
  }
  if (beach.seaState === "moderate" && beach.waveActionBaseline === "high") {
    if (tier === "high") return 2;
    if (tier === "medium") return 3;
    return 4;
  }
  return null;
}

type ScoringLogFn = (payload: Record<string, unknown>) => void;

function applySeaStateWaveActionFloorsCeilings(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline">,
  waveHeight: number | null,
  score: number,
  sargassumLevel: SargassumLevelForScore,
  logScoring: ScoringLogFn | null,
  pushStep: ((step: Omit<BeachScoreStep, "order">) => void) | null
): number {
  let s = score;
  const floorVal = swimToleranceFloor(beach, sargassumLevel);

  if (beach.seaState === "calm" && beach.waveActionBaseline === "low") {
    if (floorVal !== null && waveHeight !== null && waveHeight < 2.0 && s < floorVal) {
      const before = s;
      s = floorVal;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: `floor_${floorVal}_calm_low_lt_2m`,
          sargassumLevel: sargassumLevel ?? "low",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "floor",
        title: `Swim-tolerance floor → ${floorVal}`,
        detail: `Rule floor_${floorVal}_calm_low_lt_2m. Triggered because wave height < 2 m, score ${before.toFixed(3)} was below floor ${floorVal} (calm sea, low wave baseline; sargassum tier treated as ${sargassumLevel ?? "low"}).`,
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    if (s > 10) {
      const before = s;
      s = 10;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: "ceiling_10_calm_low",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "ceiling",
        title: "Ceiling at 10 (calm / low baseline)",
        detail:
          "Rule ceiling_10_calm_low. Triggered because score exceeded 10 after prior steps for calm sea with low wave baseline.",
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    return s;
  }

  if (beach.seaState === "moderate" && beach.waveActionBaseline === "medium") {
    if (floorVal !== null && waveHeight !== null && waveHeight < 2.0 && s < floorVal) {
      const before = s;
      s = floorVal;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: `floor_${floorVal}_moderate_medium_lt_2m`,
          sargassumLevel: sargassumLevel ?? "low",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "floor",
        title: `Swim-tolerance floor → ${floorVal}`,
        detail: `Rule floor_${floorVal}_moderate_medium_lt_2m. Triggered because wave height < 2 m, score ${before.toFixed(3)} was below floor ${floorVal} (moderate sea, medium wave baseline; sargassum tier treated as ${sargassumLevel ?? "low"}).`,
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    if (s > 9) {
      const before = s;
      s = 9;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: "ceiling_9_moderate_medium",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "ceiling",
        title: "Ceiling at 9 (moderate / medium baseline)",
        detail:
          "Rule ceiling_9_moderate_medium. Triggered because score exceeded 9 for moderate sea with medium wave baseline.",
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    return s;
  }

  if (beach.seaState === "moderate" && beach.waveActionBaseline === "high") {
    if (floorVal !== null && waveHeight !== null && waveHeight < 2.0 && s < floorVal) {
      const before = s;
      s = floorVal;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: `floor_${floorVal}_moderate_high_lt_2m`,
          sargassumLevel: sargassumLevel ?? "low",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "floor",
        title: `Swim-tolerance floor → ${floorVal}`,
        detail: `Rule floor_${floorVal}_moderate_high_lt_2m. Triggered because wave height < 2 m, score ${before.toFixed(3)} was below floor ${floorVal} (moderate sea, high wave baseline; sargassum tier treated as ${sargassumLevel ?? "low"}).`,
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    if (s > 8) {
      const before = s;
      s = 8;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: "ceiling_8_moderate_high",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: s
        });
      }
      pushStep?.({
        kind: "ceiling",
        title: "Ceiling at 8 (moderate / high baseline)",
        detail:
          "Rule ceiling_8_moderate_high. Triggered because score exceeded 8 for moderate sea with high wave baseline.",
        valueBefore: before,
        valueAfter: s,
        delta: s - before
      });
    }
    return s;
  }

  return s;
}

export type BeachScoreStepKind =
  | "null_guard"
  | "base"
  | "wave_height"
  | "period"
  | "wind_speed"
  | "wind_direction"
  | "sargassum"
  | "floor"
  | "ceiling"
  | "clamp"
  | "wind_safety_cap"
  | "round";

export type BeachScoreStep = {
  order: number;
  kind: BeachScoreStepKind;
  title: string;
  detail?: string;
  valueBefore: number | null;
  valueAfter: number | null;
  /** Additive change where applicable */
  delta?: number | null;
};

export type ExplainBeachScoreResult = {
  score: number | null;
  steps: BeachScoreStep[];
};

type RunMode = {
  emitLogs: boolean;
  recordSteps: boolean;
};

function runBeachScore(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore,
  mode: RunMode
): ExplainBeachScoreResult {
  const steps: BeachScoreStep[] = [];
  let order = 0;
  const push = mode.recordSteps
    ? (step: Omit<BeachScoreStep, "order">) => {
        order += 1;
        steps.push({ ...step, order });
      }
    : null;

  const logScoring: ScoringLogFn | null = mode.emitLogs
    ? (payload) => {
        console.log("[scoring]", payload);
      }
    : null;

  if (waveHeight === null || windSpeed === null) {
    push?.({
      kind: "null_guard",
      title: "No score (missing inputs)",
      detail:
        waveHeight === null && windSpeed === null
          ? "Both wave height and wind speed are required; both were null."
          : waveHeight === null
            ? "Wave height is null — cannot score."
            : "Wind speed is null — cannot score.",
      valueBefore: null,
      valueAfter: null,
      delta: null
    });
    return { score: null, steps: mode.recordSteps ? steps : [] };
  }

  if (beach.seaState === "rough") {
    let roughScore = 7;
    push?.({
      kind: "base",
      title: "Rough / scenic base",
      detail: "Rough sea state starts from base 7 before wave, wind, period, direction, and sargassum adjustments.",
      valueBefore: null,
      valueAfter: roughScore,
      delta: null
    });

    if (waveHeight > 3.5) {
      const before = roughScore;
      roughScore -= 2;
      push?.({
        kind: "wave_height",
        title: "Wave height (rough)",
        detail: `Wave height ${waveHeight} m > 3.5 m — apply −2.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: -2
      });
    } else if (waveHeight > 2.5) {
      const before = roughScore;
      roughScore -= 1;
      push?.({
        kind: "wave_height",
        title: "Wave height (rough)",
        detail: `Wave height ${waveHeight} m > 2.5 m — apply −1.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: -1
      });
    } else {
      push?.({
        kind: "wave_height",
        title: "Wave height (rough)",
        detail: `Wave height ${waveHeight} m ≤ 2.5 m — no wave-height tier penalty.`,
        valueBefore: roughScore,
        valueAfter: roughScore,
        delta: 0
      });
    }

    if (windSpeed > 45) {
      const before = roughScore;
      roughScore -= 2.5;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (rough)",
        detail: `Wind ${windSpeed} km/h > 45 — apply −2.5.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: -2.5
      });
    } else if (windSpeed > 35) {
      const before = roughScore;
      roughScore -= 1.5;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (rough)",
        detail: `Wind ${windSpeed} km/h > 35 — apply −1.5.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: -1.5
      });
    } else {
      push?.({
        kind: "wind_speed",
        title: "Wind speed (rough)",
        detail: `Wind ${windSpeed} km/h ≤ 35 — no rough wind-speed tier penalty.`,
        valueBefore: roughScore,
        valueAfter: roughScore,
        delta: 0
      });
    }

    if (wavePeriod !== null && !Number.isNaN(wavePeriod) && wavePeriod >= 8) {
      const before = roughScore;
      roughScore += 0.3;
      push?.({
        kind: "period",
        title: "Wave period (rough)",
        detail: `Period ${wavePeriod} s ≥ 8 s — apply +0.3.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: 0.3
      });
    } else {
      push?.({
        kind: "period",
        title: "Wave period (rough)",
        detail: "Period null/NaN or < 8 s — no period bump on rough path.",
        valueBefore: roughScore,
        valueAfter: roughScore,
        delta: 0
      });
    }

    const wd = windDirectionRelation(beach.coast, windDirection);
    {
      const before = roughScore;
      roughScore += wd.modifier;
      push?.({
        kind: "wind_direction",
        title: "Wind direction vs coast",
        detail: wd.summary,
        valueBefore: before,
        valueAfter: roughScore,
        delta: wd.modifier
      });
    }

    {
      const pen = sargassumRoughPenalty(sargassumLevel);
      const before = roughScore;
      roughScore += pen;
      push?.({
        kind: "sargassum",
        title: "Sargassum (rough / scenic)",
        detail: `Level ${String(sargassumLevel)} — penalty ${pen}.`,
        valueBefore: before,
        valueAfter: roughScore,
        delta: pen
      });
    }

    if (waveHeight < 3.0 && windSpeed < 40 && roughScore < 4) {
      const before = roughScore;
      roughScore = 4;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: "floor_4_rough_visit_window",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: roughScore
        });
      }
      push?.({
        kind: "floor",
        title: "Floor at 4 (rough visit window)",
        detail:
          "Rule floor_4_rough_visit_window. Triggered because wave height < 3 m, wind speed < 40 km/h, and score was below 4.",
        valueBefore: before,
        valueAfter: roughScore,
        delta: roughScore - before
      });
    }

    if (roughScore > 9) {
      const before = roughScore;
      roughScore = 9;
      if (logScoring) {
        logScoring({
          beachSlug: beach.slug,
          rule: "ceiling_9_rough",
          scoreBeforeFloorCeiling: before,
          finalAfterFloorCeiling: roughScore
        });
      }
      push?.({
        kind: "ceiling",
        title: "Ceiling at 9 (rough)",
        detail: "Rule ceiling_9_rough. Triggered because rough-path score exceeded 9 before final clamp/round.",
        valueBefore: before,
        valueAfter: roughScore,
        delta: roughScore - before
      });
    }

    const clamped = clampToRange(roughScore, 1, 10);
    if (clamped !== roughScore) {
      push?.({
        kind: "clamp",
        title: "Clamp to 1–10",
        detail: `Raw value ${roughScore.toFixed(4)} was outside [1, 10].`,
        valueBefore: roughScore,
        valueAfter: clamped,
        delta: clamped - roughScore
      });
    } else {
      push?.({
        kind: "clamp",
        title: "Clamp to 1–10",
        detail: "Value already inside [1, 10] — no change.",
        valueBefore: roughScore,
        valueAfter: clamped,
        delta: 0
      });
    }
    const finalRounded = finalizeClampedScore(
      beach.slug,
      clamped,
      windSpeed,
      logScoring,
      push
    );

    return { score: finalRounded, steps: mode.recordSteps ? steps : [] };
  }

  let score: number;

  if (beach.waveActionBaseline === "low") {
    score = 9.5;
    push?.({
      kind: "base",
      title: "Swim base (low wave baseline)",
      detail: "Low wave-action baseline starts at 9.5.",
      valueBefore: null,
      valueAfter: score,
      delta: null
    });
    if (waveHeight > 0.8) {
      const delta = -Math.min((waveHeight - 0.8) ** 2 * 5, 5);
      const before = score;
      score += delta;
      push?.({
        kind: "wave_height",
        title: "Wave height penalty (low baseline)",
        detail: `Wave ${waveHeight} m > 0.8 m — subtract min((h−0.8)²×5, 5).`,
        valueBefore: before,
        valueAfter: score,
        delta
      });
    } else {
      push?.({
        kind: "wave_height",
        title: "Wave height (low baseline)",
        detail: `Wave ${waveHeight} m ≤ 0.8 m — no wave-height penalty.`,
        valueBefore: score,
        valueAfter: score,
        delta: 0
      });
    }
    {
      const d = periodModifierSwimBeaches("low", wavePeriod);
      const before = score;
      score += d;
      push?.({
        kind: "period",
        title: "Wave period (low baseline)",
        detail: "Swim-beach period curve for low baseline (high baseline branch not used).",
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
    {
      const wd = windDirectionRelation(beach.coast, windDirection);
      const before = score;
      score += wd.modifier;
      push?.({
        kind: "wind_direction",
        title: "Wind direction vs coast",
        detail: wd.summary,
        valueBefore: before,
        valueAfter: score,
        delta: wd.modifier
      });
    }
    if (windSpeed > 25 && windSpeed <= 30) {
      const before = score;
      score -= 1;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (low baseline)",
        detail: `Wind ${windSpeed} km/h in (25, 30] — −1.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1
      });
    } else if (windSpeed > 30 && windSpeed <= 35) {
      const before = score;
      score -= 1.5;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (low baseline)",
        detail: `Wind ${windSpeed} km/h in (30, 35] — −1.5.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1.5
      });
    } else if (windSpeed > 35) {
      const before = score;
      score -= 2;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (low baseline)",
        detail: `Wind ${windSpeed} km/h > 35 — −2.`,
        valueBefore: before,
        valueAfter: score,
        delta: -2
      });
    } else {
      push?.({
        kind: "wind_speed",
        title: "Wind speed (low baseline)",
        detail: `Wind ${windSpeed} km/h ≤ 25 — no wind-speed penalty on low baseline.`,
        valueBefore: score,
        valueAfter: score,
        delta: 0
      });
    }
    {
      const d = sargassumSwimPenalty(beach.seaState, sargassumLevel);
      const before = score;
      score += d;
      push?.({
        kind: "sargassum",
        title: "Sargassum (swim)",
        detail: `Level ${String(sargassumLevel)} — adjustment ${d}.`,
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
  } else if (beach.waveActionBaseline === "medium") {
    score = 7.5;
    push?.({
      kind: "base",
      title: "Swim base (medium wave baseline)",
      detail: "Medium wave-action baseline starts at 7.5.",
      valueBefore: null,
      valueAfter: score,
      delta: null
    });
    if (waveHeight > 1.25) {
      const penalty = Math.min((waveHeight - 1.25) ** 2 * 4, 5);
      const before = score;
      score -= penalty;
      push?.({
        kind: "wave_height",
        title: "Wave height penalty (medium baseline)",
        detail: `Wave ${waveHeight} m > 1.25 m — subtract min((h−1.25)²×4, 5).`,
        valueBefore: before,
        valueAfter: score,
        delta: -penalty
      });
    } else {
      push?.({
        kind: "wave_height",
        title: "Wave height (medium baseline)",
        detail: `Wave ${waveHeight} m ≤ 1.25 m — no wave-height penalty.`,
        valueBefore: score,
        valueAfter: score,
        delta: 0
      });
    }
    {
      const d = periodModifierSwimBeaches("medium", wavePeriod);
      const before = score;
      score += d;
      push?.({
        kind: "period",
        title: "Wave period (medium baseline)",
        detail: "Swim-beach period curve for medium baseline.",
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
    {
      const wd = windDirectionRelation(beach.coast, windDirection);
      const before = score;
      score += wd.modifier;
      push?.({
        kind: "wind_direction",
        title: "Wind direction vs coast",
        detail: wd.summary,
        valueBefore: before,
        valueAfter: score,
        delta: wd.modifier
      });
    }
    if (windSpeed > 30 && windSpeed <= 35) {
      const before = score;
      score -= 1;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (medium baseline)",
        detail: `Wind ${windSpeed} km/h in (30, 35] — −1.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1
      });
    } else if (windSpeed > 35 && windSpeed <= 40) {
      const before = score;
      score -= 1.5;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (medium baseline)",
        detail: `Wind ${windSpeed} km/h in (35, 40] — −1.5.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1.5
      });
    } else if (windSpeed > 40) {
      const before = score;
      score -= 2;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (medium baseline)",
        detail: `Wind ${windSpeed} km/h > 40 — −2.`,
        valueBefore: before,
        valueAfter: score,
        delta: -2
      });
    } else {
      push?.({
        kind: "wind_speed",
        title: "Wind speed (medium baseline)",
        detail: `Wind ${windSpeed} km/h ≤ 30 — no wind-speed penalty on medium baseline.`,
        valueBefore: score,
        valueAfter: score,
        delta: 0
      });
    }
    {
      const d = sargassumSwimPenalty(beach.seaState, sargassumLevel);
      const before = score;
      score += d;
      push?.({
        kind: "sargassum",
        title: "Sargassum (swim)",
        detail: `Level ${String(sargassumLevel)} — adjustment ${d}.`,
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
  } else {
    score = 5.5;
    push?.({
      kind: "base",
      title: "Swim base (high wave baseline)",
      detail: "High wave-action baseline starts at 5.5.",
      valueBefore: null,
      valueAfter: score,
      delta: null
    });
    if (waveHeight < 0.55) {
      const before = score;
      score -= 1.2;
      push?.({
        kind: "wave_height",
        title: "Wave height (high baseline)",
        detail: `Wave ${waveHeight} m < 0.55 m — −1.2.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1.2
      });
    } else if (waveHeight <= 3.0) {
      const add = (waveHeight - 0.55) * 1.35;
      const before = score;
      score += add;
      push?.({
        kind: "wave_height",
        title: "Wave height (high baseline)",
        detail: `Wave ${waveHeight} m in [0.55, 3.0] — add (h − 0.55) × 1.35.`,
        valueBefore: before,
        valueAfter: score,
        delta: add
      });
    } else if (waveHeight <= 4.2) {
      const before = score;
      score += 2.5;
      push?.({
        kind: "wave_height",
        title: "Wave height (high baseline)",
        detail: `Wave ${waveHeight} m in (3.0, 4.2] — +2.5.`,
        valueBefore: before,
        valueAfter: score,
        delta: 2.5
      });
    } else {
      const before = score;
      score -= 0.8;
      push?.({
        kind: "wave_height",
        title: "Wave height (high baseline)",
        detail: `Wave ${waveHeight} m > 4.2 m — −0.8.`,
        valueBefore: before,
        valueAfter: score,
        delta: -0.8
      });
    }
    {
      const d = periodModifierHighTolerance(wavePeriod);
      const before = score;
      score += d;
      push?.({
        kind: "period",
        title: "Wave period (high-tolerance curve)",
        detail: "Period modifier for high wave-action baseline.",
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
    {
      const wd = windDirectionRelation(beach.coast, windDirection);
      const before = score;
      score += wd.modifier;
      push?.({
        kind: "wind_direction",
        title: "Wind direction vs coast",
        detail: wd.summary,
        valueBefore: before,
        valueAfter: score,
        delta: wd.modifier
      });
    }
    if (windSpeed > 35 && windSpeed <= 45) {
      const before = score;
      score -= 0.5;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (high baseline)",
        detail: `Wind ${windSpeed} km/h in (35, 45] — −0.5.`,
        valueBefore: before,
        valueAfter: score,
        delta: -0.5
      });
    } else if (windSpeed > 45) {
      const before = score;
      score -= 1;
      push?.({
        kind: "wind_speed",
        title: "Wind speed (high baseline)",
        detail: `Wind ${windSpeed} km/h > 45 — −1.`,
        valueBefore: before,
        valueAfter: score,
        delta: -1
      });
    } else {
      push?.({
        kind: "wind_speed",
        title: "Wind speed (high baseline)",
        detail: `Wind ${windSpeed} km/h ≤ 35 — no wind-speed penalty on high baseline.`,
        valueBefore: score,
        valueAfter: score,
        delta: 0
      });
    }
    {
      const d = sargassumSwimPenalty(beach.seaState, sargassumLevel);
      const before = score;
      score += d;
      push?.({
        kind: "sargassum",
        title: "Sargassum (swim)",
        detail: `Level ${String(sargassumLevel)} — adjustment ${d}.`,
        valueBefore: before,
        valueAfter: score,
        delta: d
      });
    }
  }

  score = applySeaStateWaveActionFloorsCeilings(
    beach,
    waveHeight,
    score,
    sargassumLevel,
    logScoring,
    push
  );

  if (beach.seaState === "moderate" && beach.waveActionBaseline === "high" && score > 6) {
    const before = score;
    score = Math.min(score, 6);
    if (logScoring) {
      logScoring({
        beachSlug: beach.slug,
        rule: "ceiling_6_moderate_high_swim",
        scoreBeforeSwimCeiling: before,
        finalAfterSwimCeiling: score
      });
    }
    push?.({
      kind: "ceiling",
      title: "Swim ceiling at 6 (moderate / high baseline)",
      detail:
        "Rule ceiling_6_moderate_high_swim. Triggered because moderate sea with high wave baseline and score exceeded 6 after floor/ceiling pass.",
      valueBefore: before,
      valueAfter: score,
      delta: score - before
    });
  }

  const clamped = clampToRange(score, 1, 10);
  if (clamped !== score) {
    push?.({
      kind: "clamp",
      title: "Clamp to 1–10",
      detail: `Raw value ${score.toFixed(4)} was outside [1, 10].`,
      valueBefore: score,
      valueAfter: clamped,
      delta: clamped - score
    });
  } else {
    push?.({
      kind: "clamp",
      title: "Clamp to 1–10",
      detail: "Value already inside [1, 10] — no change.",
      valueBefore: score,
      valueAfter: clamped,
      delta: 0
    });
  }
  const finalRounded = finalizeClampedScore(
    beach.slug,
    clamped,
    windSpeed,
    logScoring,
    push
  );

  return { score: finalRounded, steps: mode.recordSteps ? steps : [] };
}

/** Production score — identical to historical behaviour; emits [scoring] logs only here. */
export function computeBeachScore(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore
): number | null {
  return runBeachScore(beach, waveHeight, wavePeriod, windSpeed, windDirection, sargassumLevel, {
    emitLogs: true,
    recordSteps: false
  }).score;
}

/**
 * Same numeric result as {@link computeBeachScore} with no console output and no step list.
 * For client-side batch use (e.g. score lab table); production Open-Meteo path uses {@link computeBeachScore}.
 */
export function computeBeachScoreQuiet(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore
): number | null {
  return runBeachScore(beach, waveHeight, wavePeriod, windSpeed, windDirection, sargassumLevel, {
    emitLogs: false,
    recordSteps: false
  }).score;
}

/** Same scoring as {@link computeBeachScore} with an ordered step list; never writes to console. */
export function explainBeachScore(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore
): ExplainBeachScoreResult {
  return runBeachScore(beach, waveHeight, wavePeriod, windSpeed, windDirection, sargassumLevel, {
    emitLogs: false,
    recordSteps: true
  });
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

const EMPTY_BEACH_CONDITIONS: BeachConditions = {
  waveHeight: null,
  wavePeriod: null,
  windSpeed: null,
  windDirection: null,
  swimScore: null,
  lastUpdatedAt: null
};

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
      openMeteoFetch(weatherUrl, { revalidate: 1800 }),
      openMeteoFetch(marineUrl, { revalidate: 1800 })
    ]);

    if (weatherResponse === null || marineResponse === null) {
      console.error("[beach-conditions] Open-Meteo request failed", {
        beachSlug: beach.slug,
        beachName: beach.name,
        weatherMissed: weatherResponse === null,
        marineMissed: marineResponse === null
      });
      return (await readBeachConditionsFromCache(beach.slug)) ?? EMPTY_BEACH_CONDITIONS;
    }

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
      return (await readBeachConditionsFromCache(beach.slug)) ?? EMPTY_BEACH_CONDITIONS;
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
      return (await readBeachConditionsFromCache(beach.slug)) ?? EMPTY_BEACH_CONDITIONS;
    }

    const live: BeachConditions = {
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

    try {
      await upsertBeachConditionsCache(beach.slug, live);
    } catch (cacheErr) {
      console.error("[beach-conditions] Unexpected error awaiting cache upsert", {
        beachSlug: beach.slug,
        message: cacheErr instanceof Error ? cacheErr.message : "Unknown error"
      });
    }

    return live;
  } catch (error) {
    console.error("[beach-conditions] Failed to build beach conditions", {
      beachSlug: beach.slug,
      beachName: beach.name,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return (await readBeachConditionsFromCache(beach.slug)) ?? EMPTY_BEACH_CONDITIONS;
  }
}
