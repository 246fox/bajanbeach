import { degreesToCompass } from "@/lib/beach-format";
import type { OffshoreConditionRow } from "@/lib/offshore-conditions";
import { weatherBucket, type WeatherBucket } from "@/lib/weather-bucket";

/**
 * Dash / numeric formatting mirrors OffshoreConditionCard so map tiles and popup card
 * stay aligned — if you change rules there, update here too.
 */
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
  const common = { className: "h-4 w-4 shrink-0 text-slate-600", "aria-hidden": true as const };
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

export function OffshoreTile({ row }: Props) {
  const bucket = weatherBucket(row.weatherCode);
  const swellDir = compassOrDash(row.swellWaveDirection);
  const swellHeight = fmtM(row.swellWaveHeight, 1);
  const swellPeriod =
    row.swellWavePeriod !== null && !Number.isNaN(row.swellWavePeriod)
      ? row.swellWavePeriod.toFixed(0)
      : "—";

  const swellHeightPeriodValue =
    swellHeight === "—" && swellPeriod === "—" ? "—" : `${swellHeight} m · ${swellPeriod} s`;

  const windDir = compassOrDash(row.windDirection);
  const windValue =
    row.windSpeed === null || Number.isNaN(row.windSpeed)
      ? "—"
      : `${windDir} ${row.windSpeed.toFixed(0)} km/h`;

  return (
    <div className="w-[160px] rounded-lg bg-white p-2 text-xs text-slate-700 shadow-md ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1.5">
        <span className="font-semibold text-slate-800">{row.label}</span>
        <WeatherGlyph bucket={bucket} />
      </div>
      <dl className="mt-1.5 space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-slate-500">Swell</dt>
          <dd className="text-right font-medium text-slate-800">{swellHeightPeriodValue}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-slate-500">Swell dir</dt>
          <dd className="text-right font-medium text-slate-800">{swellDir}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-slate-500">Wind</dt>
          <dd className="text-right font-medium text-slate-800">{windValue}</dd>
        </div>
      </dl>
    </div>
  );
}
