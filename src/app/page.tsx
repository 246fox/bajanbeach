import type { ReactNode } from "react";
import { headers } from "next/headers";

type Beach = {
  name: string;
  latitude: number;
  longitude: number;
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
  { name: "Mullins", latitude: 13.2531, longitude: -59.6411, imageColor: "bg-sky-300" },
  { name: "Carlisle Bay", latitude: 13.0769, longitude: -59.6128, imageColor: "bg-cyan-300" },
  { name: "Crane Beach", latitude: 13.1019, longitude: -59.45, imageColor: "bg-blue-300" },
  { name: "Bathsheba", latitude: 13.2147, longitude: -59.5217, imageColor: "bg-teal-300" },
  { name: "Accra Beach", latitude: 13.0742, longitude: -59.5808, imageColor: "bg-indigo-300" }
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

function computeSwimScore(waveHeight: number | null, windSpeed: number | null): number | null {
  if (waveHeight === null || windSpeed === null) {
    return null;
  }

  // Lower wave height and lower wind speed produce a higher swim score.
  const wavePenalty = clampToRange(waveHeight * 2.5, 0, 6);
  const windPenalty = clampToRange(windSpeed / 10, 0, 3);
  const score = 10 - wavePenalty - windPenalty;
  return Math.round(clampToRange(score, 1, 10));
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
      swimScore: computeSwimScore(waveHeight, windSpeed),
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

async function fetchBeachPhoto(beach: Beach, baseUrl: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${baseUrl}/api/beach-photos?beach=${encodeURIComponent(beach.name)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { photoUrls?: string[] };
    return data.photoUrls?.[0] ?? null;
  } catch {
    return null;
  }
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
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const beachCards = await Promise.all(
    beaches.map(async (beach) => ({
      ...beach,
      conditions: await fetchBeachConditions(beach),
      photoUrl: await fetchBeachPhoto(beach, baseUrl)
    }))
  );

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
            key={beach.name}
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
                  Swim {beach.conditions.swimScore ?? "N/A"}/10
                </p>
              </div>

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
