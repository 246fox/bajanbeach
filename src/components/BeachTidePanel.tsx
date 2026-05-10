import type { BeachTides, TidePhase } from "@/types/beach";

function phaseLabel(phase: TidePhase | null): string {
  switch (phase) {
    case "rising":
      return "↑ Rising";
    case "falling":
      return "↓ Falling";
    case "high":
      return "Near high tide";
    case "low":
      return "Near low tide";
    default:
      return "Not available";
  }
}

function formatBarbadosDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Barbados",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function formatHeightM(m: number | null): string {
  if (m === null || Number.isNaN(m)) {
    return "—";
  }
  return `${m.toFixed(2)} m`;
}

export function BeachTidePanel({ tides }: { tides: BeachTides }) {
  const hasAny =
    tides.phase !== null ||
    tides.nextHighAt !== null ||
    tides.nextLowAt !== null;

  return (
    <div className="rounded-2xl border border-ocean-100/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-slate-800">Tides</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Model sea level from Open-Meteo (hourly)—not for coastal navigation.
      </p>

      {!hasAny ? (
        <p className="mt-4 text-sm text-slate-600">Tide data not available for this location.</p>
      ) : (
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Now</dt>
            <dd className="mt-1 text-base font-semibold text-slate-800">{phaseLabel(tides.phase)}</dd>
          </div>
          <div className="grid gap-4 border-t border-ocean-100/70 pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Next high</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {formatBarbadosDateTime(tides.nextHighAt)}
              </dd>
              <dd className="mt-0.5 text-sm text-slate-600">{formatHeightM(tides.nextHighHeightM)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Next low</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {formatBarbadosDateTime(tides.nextLowAt)}
              </dd>
              <dd className="mt-0.5 text-sm text-slate-600">{formatHeightM(tides.nextLowHeightM)}</dd>
            </div>
          </div>
        </dl>
      )}
    </div>
  );
}
