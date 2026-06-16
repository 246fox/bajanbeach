/**
 * Parity harness for computeBeachScore: write golden outputs, or verify against fixture.
 *
 *   npx tsx scripts/beach-score-parity.ts --write
 *   npx tsx scripts/beach-score-parity.ts --verify
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { Beach } from "../src/types/beach";
import type { SargassumLevelForScore } from "../src/lib/sargassum";
import { computeBeachScore } from "../src/lib/beach-conditions";
import { getBeachBySlug } from "../src/data/beaches";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "beach-score-parity.json");

/** Representative beaches: each seaState × waveActionBaseline used in scoring + coast spread */
const BEACH_SLUGS = [
  "bath-beach", // calm low East
  "dover-beach", // calm medium South
  "archers-bay", // moderate medium North
  "maycocks-bay", // moderate high North
  "barclays-park-beach", // rough high East
  "conset-bay", // rough medium East
  "six-mens-bay" // calm low West
] as const;

const WAVE_HEIGHTS = [0, 0.5, 0.8, 1.0, 1.25, 2, 2.5, 3, 3.5, 4, 4.5, 6] as const;
const WAVE_PERIODS: (number | null)[] = [null, 0, 4.9, 5, 7, 8, 9.9, 10, 20];
const WIND_SPEEDS = [0, 24, 26, 31, 33, 36, 39, 41, 44, 46, 50, 119] as const;
const WIND_DIRECTIONS: (number | null)[] = [null, 0, 45, 90, 135, 180, 225, 270, 315];
const SARGASSUM_LEVELS: SargassumLevelForScore[] = ["low", "medium", "high", null];

type FixtureV1 = {
  version: 1;
  beachSlugs: string[];
  waveHeights: number[];
  wavePeriods: (number | null)[];
  windSpeeds: number[];
  windDirections: (number | null)[];
  sargassumLevels: (string | null)[];
  /** Main grid: nested iteration beach × wave × period × wind × dir × sarg */
  mainScores: (number | null)[];
  /** null wave height: beach × period × windSpeed(20) × dir × sarg */
  nullWaveScores: (number | null)[];
  /** null wind speed: beach × period × waveHeight(2) × dir × sarg */
  nullWindScores: (number | null)[];
};

function beachPick(b: Beach): Pick<Beach, "slug" | "seaState" | "waveActionBaseline" | "coast"> {
  return {
    slug: b.slug,
    seaState: b.seaState,
    waveActionBaseline: b.waveActionBaseline,
    coast: b.coast
  };
}

/** Avoid megabytes of [scoring] logs during grid enumeration (production path still logs normally). */
function withoutConsoleLog<T>(fn: () => T): T {
  const prev = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = prev;
  }
}

function buildMainScores(): (number | null)[] {
  return withoutConsoleLog(() => {
    const out: (number | null)[] = [];
    for (const slug of BEACH_SLUGS) {
      const b = getBeachBySlug(slug);
      if (!b) {
        throw new Error(`Missing beach slug: ${slug}`);
      }
      const beach = beachPick(b);
      for (const wh of WAVE_HEIGHTS) {
        for (const wp of WAVE_PERIODS) {
          for (const ws of WIND_SPEEDS) {
            for (const wd of WIND_DIRECTIONS) {
              for (const sg of SARGASSUM_LEVELS) {
                out.push(computeBeachScore(beach, wh, wp, ws, wd, sg));
              }
            }
          }
        }
      }
    }
    return out;
  });
}

function buildNullWaveScores(): (number | null)[] {
  return withoutConsoleLog(() => {
    const out: (number | null)[] = [];
    for (const slug of BEACH_SLUGS) {
      const b = getBeachBySlug(slug);
      if (!b) throw new Error(`Missing beach slug: ${slug}`);
      const beach = beachPick(b);
      for (const wp of WAVE_PERIODS) {
        for (const wd of WIND_DIRECTIONS) {
          for (const sg of SARGASSUM_LEVELS) {
            out.push(computeBeachScore(beach, null, wp, 20, wd, sg));
          }
        }
      }
    }
    return out;
  });
}

function buildNullWindScores(): (number | null)[] {
  return withoutConsoleLog(() => {
    const out: (number | null)[] = [];
    for (const slug of BEACH_SLUGS) {
      const b = getBeachBySlug(slug);
      if (!b) throw new Error(`Missing beach slug: ${slug}`);
      const beach = beachPick(b);
      for (const wp of WAVE_PERIODS) {
        for (const wd of WIND_DIRECTIONS) {
          for (const sg of SARGASSUM_LEVELS) {
            out.push(computeBeachScore(beach, 2, wp, null, wd, sg));
          }
        }
      }
    }
    return out;
  });
}

function writeFixture(): void {
  const fixture: FixtureV1 = {
    version: 1,
    beachSlugs: [...BEACH_SLUGS],
    waveHeights: [...WAVE_HEIGHTS],
    wavePeriods: [...WAVE_PERIODS],
    windSpeeds: [...WIND_SPEEDS],
    windDirections: [...WIND_DIRECTIONS],
    sargassumLevels: SARGASSUM_LEVELS.map((s) => (s === null ? null : s)),
    mainScores: buildMainScores(),
    nullWaveScores: buildNullWaveScores(),
    nullWindScores: buildNullWindScores()
  };
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture), "utf8");
  const n =
    fixture.mainScores.length + fixture.nullWaveScores.length + fixture.nullWindScores.length;
  console.log(`Wrote ${FIXTURE_PATH} (${n} total score outputs).`);
}

function verifyFixture(): void {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  const fixture = JSON.parse(raw) as FixtureV1;
  if (fixture.version !== 1) {
    throw new Error("Unsupported fixture version");
  }
  const main = buildMainScores();
  const nw = buildNullWaveScores();
  const nwin = buildNullWindScores();

  const arrays: { name: string; a: (number | null)[]; b: (number | null)[] }[] = [
    { name: "mainScores", a: fixture.mainScores, b: main },
    { name: "nullWaveScores", a: fixture.nullWaveScores, b: nw },
    { name: "nullWindScores", a: fixture.nullWindScores, b: nwin }
  ];

  let mismatches = 0;
  for (const { name, a, b } of arrays) {
    if (a.length !== b.length) {
      console.error(`Length mismatch ${name}: fixture ${a.length} vs current ${b.length}`);
      mismatches += Math.abs(a.length - b.length);
      continue;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        mismatches++;
        if (mismatches <= 20) {
          console.error(`Mismatch ${name}[${i}]: fixture=${a[i]} current=${b[i]}`);
        }
      }
    }
  }

  const total = main.length + nw.length + nwin.length;
  if (mismatches > 0) {
    console.error(`FAILED: ${mismatches} mismatches out of ${total} combinations.`);
    process.exit(1);
  }
  console.log(`OK: ${total} combinations, all identical.`);
}

const arg = process.argv[2];
if (arg === "--write") {
  writeFixture();
} else if (arg === "--verify") {
  verifyFixture();
} else {
  console.error("Usage: npx tsx scripts/beach-score-parity.ts --write | --verify");
  process.exit(1);
}
