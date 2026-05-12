/**
 * One-off: full scoring breakdown for all beaches (live Open-Meteo + sargassum).
 * Run: npx tsx scripts/score-breakdown-dump.ts > score-dump-output.md
 */
import type { Beach } from "../src/types/beach";
import type { SargassumLevelForScore } from "../src/lib/sargassum";
import { beaches } from "../src/data/beaches";
import { windDirectionModifier } from "../src/lib/beach-conditions";
import { fetchSargassumByCoast, sargassumLevelForScoring } from "../src/lib/sargassum";

type WeatherResponse = {
  current_weather?: { windspeed?: number; winddirection?: number; time?: string };
  hourly?: { time?: string[]; windspeed_10m?: number[]; winddirection_10m?: number[] };
};

type MarineResponse = {
  current?: { wave_height?: number; wave_period?: number; time?: string };
  hourly?: { time?: string[]; wave_height?: number[]; wave_period?: number[] };
};

function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundBeachScore(value: number): number {
  return Math.round(clampToRange(value, 1, 10));
}

function sargassumRoughPenalty(level: SargassumLevelForScore): number {
  if (level === "medium") return -1.0;
  if (level === "high") return -2.0;
  return 0;
}

function sargassumSwimPenalty(_seaState: Beach["seaState"], level: SargassumLevelForScore): number {
  if (level === "medium") return -1.5;
  if (level === "high") return -3.0;
  return 0;
}

function periodModifierSwimBeaches(waveActionBaseline: Beach["waveActionBaseline"], wavePeriod: number | null): number {
  if (waveActionBaseline === "high") return 0;
  if (wavePeriod === null || Number.isNaN(wavePeriod)) return 0;
  if (wavePeriod >= 8) return 0.3;
  if (wavePeriod < 5) return -0.5;
  return 0;
}

function periodModifierHighTolerance(wavePeriod: number | null): number {
  if (wavePeriod === null || Number.isNaN(wavePeriod)) return 0;
  if (wavePeriod >= 10) return 2.5;
  if (wavePeriod >= 8) return 1.8;
  if (wavePeriod >= 6) return 0.4;
  return -0.9;
}

function applySeaStateWaveActionFloorsCeilings(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline">,
  waveHeight: number | null,
  score: number
): { score: number; rule: string | null } {
  let s = score;
  let rule: string | null = null;

  if (beach.seaState === "calm" && beach.waveActionBaseline === "low") {
    if (waveHeight !== null && waveHeight < 2.0 && s < 7) {
      rule = "floor_7_calm_low_lt_2m";
      s = 7;
    }
    if (s > 10) {
      rule = rule ? `${rule}; ceiling_10_calm_low` : "ceiling_10_calm_low";
      s = 10;
    }
    return { score: s, rule };
  }

  if (beach.seaState === "moderate" && beach.waveActionBaseline === "medium") {
    if (waveHeight !== null && waveHeight < 2.0 && s < 5) {
      rule = "floor_5_moderate_medium_lt_2m";
      s = 5;
    }
    if (s > 9) {
      rule = rule ? `${rule}; ceiling_9_moderate_medium` : "ceiling_9_moderate_medium";
      s = 9;
    }
    return { score: s, rule };
  }

  if (beach.seaState === "moderate" && beach.waveActionBaseline === "high") {
    if (waveHeight !== null && waveHeight < 2.0 && s < 4) {
      rule = "floor_4_moderate_high_lt_2m";
      s = 4;
    }
    if (s > 8) {
      rule = rule ? `${rule}; ceiling_8_moderate_high` : "ceiling_8_moderate_high";
      s = 8;
    }
    return { score: s, rule };
  }

  return { score: s, rule: null };
}

function degreesToCompass(degrees: number | null): string {
  if (degrees === null || Number.isNaN(degrees)) return "N/A";
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

type Breakdown = {
  beach: Beach;
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  sargassumLevel: SargassumLevelForScore;
  sargassumLabel: string;
  windDirMod: number;
  sargassumPenalty: number;
  windSpeedPenalty: number;
  periodMod: number;
  waveHeightEffect: number;
  startingBase: number;
  roughWaveTier: number;
  roughWindTier: number;
  rawBeforeFloorCeiling: number;
  floorCeilingRule: string | null;
  finalScore: number | null;
};

async function fetchInputs(beach: Beach): Promise<{
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${beach.latitude}&longitude=${beach.longitude}` +
    "&current_weather=true&hourly=windspeed_10m,winddirection_10m&timezone=auto";
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${beach.latitude}&longitude=${beach.longitude}` +
    "&current=wave_height,wave_period&hourly=wave_height,wave_period&timezone=auto";

  const [weatherResponse, marineResponse] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
  if (!weatherResponse.ok || !marineResponse.ok) {
    return { waveHeight: null, wavePeriod: null, windSpeed: null, windDirection: null };
  }
  const weatherData = (await weatherResponse.json()) as WeatherResponse;
  const marineData = (await marineResponse.json()) as MarineResponse;
  const windSpeed =
    weatherData.current_weather?.windspeed ?? weatherData.hourly?.windspeed_10m?.[0] ?? null;
  const windDirection =
    weatherData.current_weather?.winddirection ?? weatherData.hourly?.winddirection_10m?.[0] ?? null;
  const waveHeight = marineData.current?.wave_height ?? marineData.hourly?.wave_height?.[0] ?? null;
  const wavePeriod = marineData.current?.wave_period ?? marineData.hourly?.wave_period?.[0] ?? null;
  return { waveHeight, wavePeriod, windSpeed, windDirection };
}

function computeBreakdown(
  beach: Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast">,
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null,
  windDirection: number | null,
  sargassumLevel: SargassumLevelForScore,
  fullBeach: Beach
): Breakdown {
  const windDirMod = windDirectionModifier(beach.coast, windDirection);

  const empty: Breakdown = {
    beach: fullBeach,
    waveHeight,
    wavePeriod,
    windSpeed,
    windDirection,
    sargassumLevel,
    sargassumLabel: sargassumLevel ?? "null",
    windDirMod: 0,
    sargassumPenalty: 0,
    windSpeedPenalty: 0,
    periodMod: 0,
    waveHeightEffect: 0,
    startingBase: 0,
    roughWaveTier: 0,
    roughWindTier: 0,
    rawBeforeFloorCeiling: 0,
    floorCeilingRule: null,
    finalScore: null
  };

  if (waveHeight === null || windSpeed === null) {
    return { ...empty, windDirMod };
  }

  if (beach.seaState === "rough") {
    let roughScore = 7;
    let roughWaveTier = 0;
    if (waveHeight > 3.5) {
      roughWaveTier = -2;
      roughScore -= 2;
    } else if (waveHeight > 2.5) {
      roughWaveTier = -1;
      roughScore -= 1;
    }

    let roughWindTier = 0;
    if (windSpeed > 45) {
      roughWindTier = -2.5;
      roughScore -= 2.5;
    } else if (windSpeed > 35) {
      roughWindTier = -1.5;
      roughScore -= 1.5;
    }

    let periodMod = 0;
    if (wavePeriod !== null && !Number.isNaN(wavePeriod) && wavePeriod >= 8) {
      periodMod = 0.3;
      roughScore += periodMod;
    }

    roughScore += windDirMod;
    const sargPen = sargassumRoughPenalty(sargassumLevel);
    roughScore += sargPen;

    const rawBeforeFloorCeiling = roughScore;
    let floorRule: string | null = null;
    if (waveHeight < 3.0 && windSpeed < 40 && roughScore < 4) {
      floorRule = "floor_4_rough_visit_window";
      roughScore = 4;
    }
    if (roughScore > 9) {
      floorRule = floorRule ? `${floorRule}; ceiling_9_rough` : "ceiling_9_rough";
      roughScore = 9;
    }

    return {
      beach: fullBeach,
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      sargassumLevel,
      sargassumLabel: sargassumLevel ?? "null",
      windDirMod,
      sargassumPenalty: sargPen,
      windSpeedPenalty: roughWindTier,
      periodMod,
      waveHeightEffect: roughWaveTier,
      startingBase: 7,
      roughWaveTier,
      roughWindTier,
      rawBeforeFloorCeiling,
      floorCeilingRule: floorRule,
      finalScore: roundBeachScore(roughScore)
    };
  }

  let score: number;
  let waveHeightEffect = 0;
  let windSpeedPenalty = 0;
  let periodMod = 0;
  let startingBase: number;

  if (beach.waveActionBaseline === "low") {
    startingBase = 9.5;
    score = 9.5;
    if (waveHeight > 0.8) {
      waveHeightEffect = -Math.min((waveHeight - 0.8) ** 2 * 5, 5);
      score += waveHeightEffect;
    }
    periodMod = periodModifierSwimBeaches("low", wavePeriod);
    score += periodMod;
    score += windDirMod;
    if (windSpeed > 25 && windSpeed <= 30) {
      windSpeedPenalty = -1;
    } else if (windSpeed > 30 && windSpeed <= 35) {
      windSpeedPenalty = -1.5;
    } else if (windSpeed > 35) {
      windSpeedPenalty = -2;
    }
    score += windSpeedPenalty;
    const sargPen = sargassumSwimPenalty(beach.seaState, sargassumLevel);
    score += sargPen;
    const rawBefore = score;
    const { score: after, rule } = applySeaStateWaveActionFloorsCeilings(beach, waveHeight, score);
    return {
      beach: fullBeach,
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      sargassumLevel,
      sargassumLabel: sargassumLevel ?? "null",
      windDirMod,
      sargassumPenalty: sargPen,
      windSpeedPenalty,
      periodMod,
      waveHeightEffect,
      startingBase,
      roughWaveTier: 0,
      roughWindTier: 0,
      rawBeforeFloorCeiling: rawBefore,
      floorCeilingRule: rule,
      finalScore: roundBeachScore(after)
    };
  }

  if (beach.waveActionBaseline === "medium") {
    startingBase = 7.5;
    score = 7.5;
    if (waveHeight > 1.25) {
      waveHeightEffect = -Math.min((waveHeight - 1.25) ** 2 * 4, 5);
      score += waveHeightEffect;
    }
    periodMod = periodModifierSwimBeaches("medium", wavePeriod);
    score += periodMod;
    score += windDirMod;
    if (windSpeed > 30 && windSpeed <= 35) {
      windSpeedPenalty = -1;
    } else if (windSpeed > 35 && windSpeed <= 40) {
      windSpeedPenalty = -1.5;
    } else if (windSpeed > 40) {
      windSpeedPenalty = -2;
    }
    score += windSpeedPenalty;
    const sargPen = sargassumSwimPenalty(beach.seaState, sargassumLevel);
    score += sargPen;
    const rawBefore = score;
    const { score: after, rule } = applySeaStateWaveActionFloorsCeilings(beach, waveHeight, score);
    return {
      beach: fullBeach,
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      sargassumLevel,
      sargassumLabel: sargassumLevel ?? "null",
      windDirMod,
      sargassumPenalty: sargPen,
      windSpeedPenalty,
      periodMod,
      waveHeightEffect,
      startingBase,
      roughWaveTier: 0,
      roughWindTier: 0,
      rawBeforeFloorCeiling: rawBefore,
      floorCeilingRule: rule,
      finalScore: roundBeachScore(after)
    };
  }

  startingBase = 5.5;
  score = 5.5;
  if (waveHeight < 0.55) {
    waveHeightEffect = -1.2;
    score -= 1.2;
  } else if (waveHeight <= 3.0) {
    waveHeightEffect = (waveHeight - 0.55) * 1.35;
    score += waveHeightEffect;
  } else if (waveHeight <= 4.2) {
    waveHeightEffect = 2.5;
    score += 2.5;
  } else {
    waveHeightEffect = -0.8;
    score -= 0.8;
  }
  periodMod = periodModifierHighTolerance(wavePeriod);
  score += periodMod;
  score += windDirMod;
  if (windSpeed > 35 && windSpeed <= 45) {
    windSpeedPenalty = -0.5;
  } else if (windSpeed > 45) {
    windSpeedPenalty = -1;
  }
  score += windSpeedPenalty;
  const sargPen = sargassumSwimPenalty(beach.seaState, sargassumLevel);
  score += sargPen;
  const rawBefore = score;
  let { score: after, rule } = applySeaStateWaveActionFloorsCeilings(beach, waveHeight, score);
  if (beach.seaState === "moderate" && beach.waveActionBaseline === "high" && after > 6) {
    after = Math.min(after, 6);
    rule = rule ? `${rule}; ceiling_6_moderate_high_swim` : "ceiling_6_moderate_high_swim";
  }
  return {
    beach: fullBeach,
    waveHeight,
    wavePeriod,
    windSpeed,
    windDirection,
    sargassumLevel,
    sargassumLabel: sargassumLevel ?? "null",
    windDirMod,
    sargassumPenalty: sargPen,
    windSpeedPenalty,
    periodMod,
    waveHeightEffect,
    startingBase,
    roughWaveTier: 0,
    roughWindTier: 0,
    rawBeforeFloorCeiling: rawBefore,
    floorCeilingRule: rule,
    finalScore: roundBeachScore(after)
  };
}

const COAST_ORDER: Beach["coast"][] = ["North", "West", "South", "Southeast", "East"];

async function main() {
  const sargassumByCoast = await fetchSargassumByCoast();

  console.log("# Scoring breakdown — all beaches (live snapshot)");
  console.log("");
  console.log("Open-Meteo current/hourly[0] per beach; sargassum from Supabase when configured (stale → null).");
  console.log("");
  console.log("## Sargassum level used for scoring (by coast)");
  console.log("");
  console.log("| Coast | Level for score |");
  console.log("|-------|-----------------|");
  for (const c of COAST_ORDER) {
    const row = sargassumByCoast[c];
    const lvl = sargassumLevelForScoring(row);
    console.log(`| ${c} | ${lvl === null ? "null (no penalty / unavailable)" : lvl} |`);
  }
  console.log("");

  const rows: Breakdown[] = [];
  for (const beach of beaches) {
    const inputs = await fetchInputs(beach);
    const sLvl = sargassumLevelForScoring(sargassumByCoast[beach.coast]);
    rows.push(computeBreakdown(beach, inputs.waveHeight, inputs.wavePeriod, inputs.windSpeed, inputs.windDirection, sLvl, beach));
    await new Promise((r) => setTimeout(r, 120));
  }

  for (const coast of COAST_ORDER) {
    const subset = rows
      .filter((r) => r.beach.coast === coast)
      .sort((a, b) => {
        if (a.finalScore === null && b.finalScore === null) return a.beach.name.localeCompare(b.beach.name);
        if (a.finalScore === null) return 1;
        if (b.finalScore === null) return -1;
        return b.finalScore - a.finalScore;
      });

    console.log(`## ${coast} coast (${subset.length} beaches)`);
    console.log("");
    console.log(
      "| Beach | State | Baseline | Surf | H(m) | P(s) | Wind | Dir° | Compass | Sarg | Wdir | SargΔ | WindΔ | PerΔ | HΔ | Raw | FC | Final |"
    );
    console.log("|-------|-------|----------|------|------|------|------|------|---------|------|------|-------|-------|------|----|----|----|-------|");

    for (const r of subset) {
      const h = r.waveHeight === null ? "—" : r.waveHeight.toFixed(2);
      const p = r.wavePeriod === null ? "—" : r.wavePeriod.toFixed(1);
      const w = r.windSpeed === null ? "—" : r.windSpeed.toFixed(0);
      const d = r.windDirection === null ? "—" : r.windDirection.toFixed(0);
      const comp = degreesToCompass(r.windDirection);
      const fc = r.floorCeilingRule ?? "—";
      const fin = r.finalScore === null ? "—" : String(r.finalScore);
      const raw = r.finalScore === null ? "—" : r.rawBeforeFloorCeiling.toFixed(2);
      console.log(
        `| ${r.beach.name} | ${r.beach.seaState} | ${r.beach.waveActionBaseline} | ${r.beach.isSurfSpot ? "Y" : "N"} | ${h} | ${p} | ${w} | ${d} | ${comp} | ${r.sargassumLabel} | ${r.windDirMod >= 0 ? "+" : ""}${r.windDirMod} | ${r.sargassumPenalty >= 0 ? "+" : ""}${r.sargassumPenalty} | ${r.windSpeedPenalty >= 0 ? "+" : ""}${r.windSpeedPenalty} | ${r.periodMod >= 0 ? "+" : ""}${r.periodMod} | ${r.waveHeightEffect >= 0 ? "+" : ""}${r.waveHeightEffect.toFixed(2)} | ${raw} | ${fc} | ${fin} |`
      );
    }
    console.log("");
  }

  console.log("## Modifier legend");
  console.log("");
  console.log("- **Wdir**: `windDirectionModifier` (offshore +0.5, onshore −1, else 0).");
  console.log("- **SargΔ**: sargassum swim penalty (medium −1.5, high −3) or rough scenic (medium −1, high −2); null level → 0.");
  console.log("- **WindΔ**: wind-speed tier penalty for that baseline path.");
  console.log("- **PerΔ**: period modifier (swim low/medium vs high-tolerance curve for high baseline).");
  console.log("- **HΔ**: wave-height effect — rough coast uses tier (−1/−2); swim uses penalty/additive per baseline (see `beach-conditions.ts`).");
  console.log("- **Raw**: score after all additive steps, **before** floor/ceiling; rough uses value before rough floor/ceiling where applicable.");
  console.log("- **FC**: floor/ceiling rule applied after Raw (— if none).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
