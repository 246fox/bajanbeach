import { degreesToCompass } from "@/lib/beach-format";
import type { OffshoreConditionRow } from "@/lib/offshore-conditions";

type WeatherBucket = "clear" | "partlyCloudy" | "cloudy" | "rainShowers" | "thunderstorm";

function weatherBucketFromCode(code: number | null): WeatherBucket {
  if (code === null || Number.isNaN(code)) {
    return "cloudy";
  }
  const c = Math.trunc(code);
  if (c >= 95 && c <= 99) {
    return "thunderstorm";
  }
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c === 50) {
    return "rainShowers";
  }
  if (c === 0 || c === 1) {
    return "clear";
  }
  if (c === 2 || c === 3) {
    return "partlyCloudy";
  }
  return "cloudy";
}

function compassOrDash(degrees: number | null): string {
  if (degrees === null || Number.isNaN(degrees)) {
    return "—";
  }
  return degreesToCompass(degrees);
}

function fmtM(value: number | null, digits: number): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

function WeatherGlyph({ bucket }: { bucket: WeatherBucket }) {
  const common = { className: "h-8 w-8 shrink-0 text-slate-600", "aria-hidden": true as const };
  switch (bucket) {
    case "clear":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "partlyCloudy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <path d="M6 18a4 4 0 0 1 0-8 4 4 0 0 1 4-4 4 4 0 0 1 3.9 3" />
          <path d="M8 18h10a3 3 0 0 0 0-6h-1.5" strokeLinecap="round" />
        </svg>
      );
    case "cloudy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <path d="M6 18h12a4 4 0 0 0 0-8 4 4 0 0 0-4-4 4 4 0 0 0-3.9 3" strokeLinecap="round" />
          <path d="M8 14h11a3.5 3.5 0 0 0 0-7" strokeLinecap="round" opacity="0.55" />
        </svg>
      );
    case "rainShowers":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <path d="M6 16h12a4 4 0 0 0 0-8 4 4 0 0 0-4-4 4 4 0 0 0-3.9 3" strokeLinecap="round" />
          <path strokeLinecap="round" d="M9 20v2M12 20v2M15 20v2" />
        </svg>
      );
    case "thunderstorm":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <path d="M6 16h12a4 4 0 0 0 0-8 4 4 0 0 0-4-4 4 4 0 0 0-3.9 3" strokeLinecap="round" />
          <path fill="currentColor" d="m11 18 2-4h-2l1-3h3l-2 4h2l-2 3Z" />
        </svg>
      );
    default: {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...common}>
          <path d="M6 18h12a4 4 0 0 0 0-8 4 4 0 0 0-4-4 4 4 0 0 0-3.9 3" strokeLinecap="round" />
        </svg>
      );
    }
  }
}

type Props = {
  row: OffshoreConditionRow;
};

export function OffshoreConditionCard({ row }: Props) {
  const bucket = weatherBucketFromCode(row.weatherCode);
  const swellDir = compassOrDash(row.swellWaveDirection);
  const windDir = compassOrDash(row.windDirection);
  const swellHeight = fmtM(row.swellWaveHeight, 1);
  const swellPeriod = row.swellWavePeriod !== null && !Number.isNaN(row.swellWavePeriod) ? row.swellWavePeriod.toFixed(0) : "—";
  const swellLine =
    swellHeight === "—" && swellPeriod === "—" && swellDir === "—"
      ? "—"
      : `${swellHeight} m · ${swellPeriod} s · ${swellDir}`;

  const windLine =
    row.windSpeed === null || Number.isNaN(row.windSpeed)
      ? "—"
      : `${windDir} ${row.windSpeed.toFixed(0)} km/h`;

  return (
    <div className="max-w-xs p-4 text-sm text-slate-700">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
        <WeatherGlyph bucket={bucket} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open ocean</p>
          <h3 className="text-lg font-semibold text-slate-800">{row.label} coast</h3>
        </div>
      </div>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Waves</dt>
          <dd className="font-medium text-slate-800">{fmtM(row.waveHeight, 1)} m</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Swell</dt>
          <dd className="text-right font-medium text-slate-800">{swellLine}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Wind</dt>
          <dd className="text-right font-medium text-slate-800">{windLine}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Sea</dt>
          <dd className="font-medium text-slate-800">{fmtM(row.seaSurfaceTemperature, 1)} °C</dd>
        </div>
      </dl>
    </div>
  );
}
