import type { ReactNode } from "react";
import { getBeachPhotoUrls } from "@/lib/beach-photos";

type Beach = {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  coast: "West" | "South" | "East";
  type: "calm" | "moderate" | "surf";
  description: string;
  imageColor: string;
};

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

type BeachConditions = {
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  swimScore: number | null;
  lastUpdatedAt: string | null;
};

const beaches: Beach[] = [
  {
    name: "Mullins",
    slug: "mullins",
    latitude: 13.2337937,
    longitude: -59.6425256,
    coast: "West",
    type: "calm",
    description: "A sheltered west-coast beach with gentle water and a relaxed, upscale vibe.",
    imageColor: "bg-sky-300"
  },
  {
    name: "Carlisle Bay",
    slug: "carlisle-bay",
    latitude: 13.087425,
    longitude: -59.6154379,
    coast: "South",
    type: "calm",
    description: "A broad bay near Bridgetown known for clear water, swimming, and easy-access reefs.",
    imageColor: "bg-cyan-300"
  },
  {
    name: "Crane Beach",
    slug: "crane-beach",
    latitude: 13.1066506,
    longitude: -59.4437384,
    coast: "East",
    type: "moderate",
    description: "A dramatic cliff-backed beach with pink-tinged sand and stronger Atlantic shore break.",
    imageColor: "bg-blue-300"
  },
  {
    name: "Bathsheba",
    slug: "bathsheba",
    latitude: 13.2129361,
    longitude: -59.5227245,
    coast: "East",
    type: "surf",
    description: "A rugged east-coast setting with boulders and consistent swell favored by surfers.",
    imageColor: "bg-teal-300"
  },
  {
    name: "Accra Beach",
    slug: "accra-beach",
    latitude: 13.0731047,
    longitude: -59.588012,
    coast: "South",
    type: "moderate",
    description: "A lively south-coast beach with mixed conditions, popular for both swimming and bodyboarding.",
    imageColor: "bg-indigo-300"
  },
  {
    name: "Holetown Beach",
    slug: "holetown-beach",
    latitude: 13.185621,
    longitude: -59.6385289,
    coast: "West",
    type: "calm",
    description: "A central west-coast shoreline in Holetown with generally calm water and easy access.",
    imageColor: "bg-sky-300"
  },
  {
    name: "Paynes Bay",
    slug: "paynes-bay",
    latitude: 13.1655349,
    longitude: -59.6362336,
    coast: "West",
    type: "calm",
    description: "A long, sandy west-coast bay with clear, usually gentle water ideal for snorkeling.",
    imageColor: "bg-cyan-300"
  },
  {
    name: "Sandy Lane Bay",
    slug: "sandy-lane-bay",
    latitude: 13.1682794,
    longitude: -59.6372693,
    coast: "West",
    type: "calm",
    description: "A protected west-coast bay with soft sand and consistently calm sea conditions.",
    imageColor: "bg-blue-300"
  },
  {
    name: "Brighton Beach",
    slug: "brighton-beach",
    latitude: 13.1211555,
    longitude: -59.6303754,
    coast: "West",
    type: "calm",
    description: "A local-favorite west-coast beach with gentle surf and broad sandy frontage.",
    imageColor: "bg-teal-300"
  },
  {
    name: "Brownes Beach",
    slug: "brownes-beach",
    latitude: 13.0856853,
    longitude: -59.6097046,
    coast: "South",
    type: "calm",
    description: "A wide, popular beach by Bridgetown with generally calm water and easy swimming.",
    imageColor: "bg-indigo-300"
  },
  {
    name: "Brandons Beach",
    slug: "brandons-beach",
    latitude: 13.1145398,
    longitude: -59.6272748,
    coast: "West",
    type: "calm",
    description: "A spacious west-coast stretch with mellow conditions and fewer crowds than central beaches.",
    imageColor: "bg-sky-300"
  },
  {
    name: "Miami Beach (Barbados)",
    slug: "miami-beach-barbados",
    latitude: 13.0605435,
    longitude: -59.5407149,
    coast: "South",
    type: "moderate",
    description: "A scenic south-coast beach with a calmer side for swimming and livelier waves nearby.",
    imageColor: "bg-cyan-300"
  },
  {
    name: "Silver Sands",
    slug: "silver-sands",
    latitude: 13.0473494,
    longitude: -59.5222234,
    coast: "South",
    type: "surf",
    description: "A breezy south-coast spot known for stronger wind and wave conditions.",
    imageColor: "bg-blue-300"
  },
  {
    name: "Long Beach",
    slug: "long-beach",
    latitude: 13.0659198,
    longitude: -59.5047515,
    coast: "East",
    type: "surf",
    description: "A remote Atlantic-facing beach with open exposure, stronger surf, and fewer facilities.",
    imageColor: "bg-teal-300"
  },
  {
    name: "Bottom Bay",
    slug: "bottom-bay",
    latitude: 13.139541,
    longitude: -59.4269296,
    coast: "East",
    type: "surf",
    description: "A picturesque cove below cliffs with beautiful sand but often rough Atlantic swell.",
    imageColor: "bg-indigo-300"
  },
  {
    name: "Foul Bay",
    slug: "foul-bay",
    latitude: 13.0966061,
    longitude: -59.454875,
    coast: "East",
    type: "surf",
    description: "A broad, open beach with energetic waves and a wild east-coast feel.",
    imageColor: "bg-sky-300"
  },
  {
    name: "Cattlewash",
    slug: "cattlewash",
    latitude: 13.2217907,
    longitude: -59.5320141,
    coast: "East",
    type: "surf",
    description: "A long east-coast strip with persistent Atlantic swell and dramatic scenery.",
    imageColor: "bg-cyan-300"
  },
  {
    name: "Soup Bowl",
    slug: "soup-bowl",
    latitude: 13.2145687,
    longitude: -59.5231763,
    coast: "East",
    type: "surf",
    description: "Barbados' iconic surf break with powerful, consistent waves near Bathsheba.",
    imageColor: "bg-blue-300"
  },
  {
    name: "Freights Bay",
    slug: "freights-bay",
    latitude: 13.0529211,
    longitude: -59.5352343,
    coast: "South",
    type: "surf",
    description: "A south-coast surf beach known for long, friendly right-hand waves.",
    imageColor: "bg-teal-300"
  },
  {
    name: "Surfers Point",
    slug: "surfers-point",
    latitude: 13.053152,
    longitude: -59.5059623,
    coast: "South",
    type: "surf",
    description: "A wind- and swell-exposed point area popular with surfers and kite or windsurfers.",
    imageColor: "bg-indigo-300"
  },
  {
    name: "Enterprise Beach",
    slug: "enterprise-beach",
    latitude: 13.0599465,
    longitude: -59.538695,
    coast: "South",
    type: "moderate",
    description: "A scenic south-coast beach with alternating calm pockets and active shore break.",
    imageColor: "bg-sky-300"
  },
  {
    name: "Rockley Beach",
    slug: "rockley-beach",
    latitude: 13.0731047,
    longitude: -59.588012,
    coast: "South",
    type: "moderate",
    description: "A busy south-coast beach with mixed sea state and plenty of nearby amenities.",
    imageColor: "bg-cyan-300"
  },
  {
    name: "Worthing Beach",
    slug: "worthing-beach",
    latitude: 13.0711426,
    longitude: -59.5828412,
    coast: "South",
    type: "calm",
    description: "A generally sheltered south-coast beach with easy swimming and a relaxed atmosphere.",
    imageColor: "bg-blue-300"
  },
  {
    name: "Maxwell Beach",
    slug: "maxwell-beach",
    latitude: 13.0647756,
    longitude: -59.5616773,
    coast: "South",
    type: "moderate",
    description: "A long south-coast beach where conditions vary from calm stretches to moderate surf.",
    imageColor: "bg-teal-300"
  },
  {
    name: "Oistins Bay",
    slug: "oistins-bay",
    latitude: 13.0634152,
    longitude: -59.5426339,
    coast: "South",
    type: "calm",
    description: "A sheltered bay area near Oistins with mostly gentle water and local activity.",
    imageColor: "bg-indigo-300"
  }
];

function formatValue(value: number | null, unit: string, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${value.toFixed(digits)} ${unit}`;
}

function degreesToCompass(degrees: number | null): string {
  if (degrees === null || Number.isNaN(degrees)) {
    return "N/A";
  }

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];

  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function clampToRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundBeachScore(value: number): number {
  return Math.round(clampToRange(value, 1, 10));
}

function computeBeachScore(
  beachType: Beach["type"],
  waveHeight: number | null,
  wavePeriod: number | null,
  windSpeed: number | null
): number | null {
  if (waveHeight === null || windSpeed === null) {
    return null;
  }

  if (beachType === "calm") {
    let score = 9;

    if (waveHeight <= 0.8) score += 0.2;
    else if (waveHeight <= 1.0) score += 0;
    else if (waveHeight <= 1.25) score -= 1;
    else if (waveHeight <= 1.5) score -= 2;
    else if (waveHeight <= 2.0) score -= 3.5;
    else score -= 5;

    if (windSpeed > 25 && windSpeed <= 30) score -= 1;
    else if (windSpeed > 30 && windSpeed <= 35) score -= 1.5;
    else if (windSpeed > 35) score -= 2;

    return roundBeachScore(score);
  }

  if (beachType === "moderate") {
    let score = 7;

    if (waveHeight <= 0.8) score += 0.5;
    else if (waveHeight <= 1.5) score += 0;
    else if (waveHeight <= 2.0) score -= 1.5;
    else if (waveHeight <= 2.5) score -= 3;
    else score -= 4.5;

    if (windSpeed > 30 && windSpeed <= 35) score -= 1;
    else if (windSpeed > 35 && windSpeed <= 40) score -= 1.5;
    else if (windSpeed > 40) score -= 2;

    return roundBeachScore(score);
  }

  let score = 3.5;

  if (waveHeight < 0.7) score -= 2;
  else if (waveHeight < 1.2) score -= 0.5;
  else if (waveHeight <= 1.5) score += 1;
  else if (waveHeight <= 3.0) score += 3;
  else if (waveHeight <= 3.8) score += 1.5;
  else score -= 1;

  if (wavePeriod !== null) {
    if (wavePeriod >= 10) score += 2;
    else if (wavePeriod >= 8) score += 1.2;
    else if (wavePeriod >= 6) score += 0.4;
    else score -= 1.2;
  }

  if (windSpeed > 35 && windSpeed <= 45) score -= 0.5;
  else if (windSpeed > 45) score -= 1;

  return roundBeachScore(score);
}

function scoreStyles(score: number | null): string {
  if (score === null) {
    return "bg-slate-100 text-slate-600";
  }
  if (score > 7) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 4) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

function coastChipStyles(coast: Beach["coast"]): string {
  if (coast === "West") {
    return "bg-sky-100 text-sky-700 ring-sky-200";
  }
  if (coast === "South") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }
  return "bg-emerald-100 text-emerald-700 ring-emerald-200";
}

function typeChipStyles(type: Beach["type"]): string {
  if (type === "calm") {
    return "bg-sky-100 text-sky-700 ring-sky-200";
  }
  if (type === "moderate") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }
  return "bg-teal-100 text-teal-700 ring-teal-200";
}

function missingScoreReason(conditions: BeachConditions): string | null {
  if (conditions.waveHeight === null && conditions.windSpeed === null) {
    return "Score unavailable: missing wave and wind data.";
  }
  if (conditions.waveHeight === null) {
    return "Score unavailable: missing wave data.";
  }
  if (conditions.windSpeed === null) {
    return "Score unavailable: missing wind data.";
  }
  return null;
}

function parseOpenMeteoTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatUpdatedTime(timestamp: string | null): string {
  if (!timestamp) {
    return "Updated N/A";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Updated N/A";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Barbados",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);

  return `Updated ${formatted} AST`;
}

function isStaleTimestamp(timestamp: string | null, maxAgeMs: number): boolean {
  if (!timestamp) {
    return false;
  }
  const updatedAt = new Date(timestamp).getTime();
  if (Number.isNaN(updatedAt)) {
    return false;
  }
  return Date.now() - updatedAt > maxAgeMs;
}

async function fetchBeachConditions(beach: Beach): Promise<BeachConditions> {
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

    return {
      waveHeight,
      wavePeriod,
      windSpeed,
      windDirection,
      swimScore: computeBeachScore(beach.type, waveHeight, wavePeriod, windSpeed),
      lastUpdatedAt: combinedTimestamp !== null ? new Date(combinedTimestamp).toISOString() : null
    };
  } catch {
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      results[i] = await mapper(items[i], i);
    }
  }

  const pool = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

function MetricRow({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-ocean-700">
      <path
        d="M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-ocean-700">
      <path
        d="M3 10h11a2.5 2.5 0 1 0-2.5-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 14h15a2.5 2.5 0 1 1-2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-ocean-700">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9 15l2-6 6-2-2 6-6 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-ocean-700">
      <circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 14V10m0 4 2.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 3h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default async function Home() {
  const beachCards = await mapWithConcurrency(beaches, 8, async (beach) => {
    const [conditions, photoUrls] = await Promise.all([
      fetchBeachConditions(beach),
      getBeachPhotoUrls(beach.name)
    ]);
    return {
      ...beach,
      conditions,
      photoUrl: photoUrls[0] ?? null
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean-700">
          Barbados Beach Tracker
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
          BajanBeach
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Live wave and wind conditions for your favorite Barbados beaches, refreshed every hour.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {beachCards.map((beach) => (
          <article
            key={beach.slug}
            className="overflow-hidden rounded-2xl border border-ocean-100/70 bg-white/75 shadow-sm backdrop-blur-sm"
          >
            <div
              className={`h-32 w-full ${beach.imageColor}`}
              style={
                beach.photoUrl
                  ? {
                      backgroundImage: `url("${beach.photoUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }
                  : undefined
              }
            />
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-800">{beach.name}</h2>
                <p
                  className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreStyles(
                    beach.conditions.swimScore
                  )}`}
                >
                  {beach.type === "surf" ? "Surf" : "Swim"} {beach.conditions.swimScore ?? "N/A"}/10
                </p>
              </div>
              {beach.conditions.swimScore === null && (
                <p className="text-xs text-slate-500">{missingScoreReason(beach.conditions)}</p>
              )}
              <p className="text-sm text-slate-600">{beach.description}</p>

              <div className="space-y-2.5">
                <MetricRow
                  icon={<WaveIcon />}
                  label="Wave height"
                  value={formatValue(beach.conditions.waveHeight, "m")}
                />
                <MetricRow
                  icon={<TimerIcon />}
                  label="Wave period"
                  value={formatValue(beach.conditions.wavePeriod, "s")}
                />
                <MetricRow
                  icon={<WindIcon />}
                  label="Wind speed"
                  value={formatValue(beach.conditions.windSpeed, "km/h")}
                />
                <MetricRow
                  icon={<CompassIcon />}
                  label="Wind direction"
                  value={degreesToCompass(beach.conditions.windDirection)}
                />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${coastChipStyles(
                    beach.coast
                  )}`}
                >
                  {beach.coast} coast
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${typeChipStyles(
                    beach.type
                  )}`}
                >
                  {beach.type}
                </span>
              </div>
              <p
                className={`pt-1 text-xs ${
                  isStaleTimestamp(beach.conditions.lastUpdatedAt, 2 * 60 * 60 * 1000)
                    ? "text-amber-700"
                    : "text-slate-500"
                }`}
              >
                {formatUpdatedTime(beach.conditions.lastUpdatedAt)}
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
