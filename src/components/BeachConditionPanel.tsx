import type { ReactNode } from "react";
import type { Beach, BeachConditions } from "@/types/beach";
import {
  activityLabel,
  degreesToCompass,
  formatUpdatedTime,
  formatValue,
  isStaleTimestamp,
  missingScoreReason,
  scoreStyles
} from "@/lib/beach-format";

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

export function BeachConditionPanel({
  beach,
  conditions
}: {
  beach: Beach;
  conditions: BeachConditions;
}) {
  const scoreKind = activityLabel(beach);

  return (
    <div className="rounded-2xl border border-ocean-100/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ocean-100/80 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Live conditions</h2>
          <p className="mt-1 text-xs text-slate-500">Open-Meteo marine & weather near this beach</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {scoreKind} score
          </p>
          <p
            className={`mt-1 inline-flex rounded-full px-4 py-1.5 text-lg font-bold ${scoreStyles(
              conditions.swimScore
            )}`}
          >
            {conditions.swimScore ?? "N/A"}/10
          </p>
        </div>
      </div>

      {conditions.swimScore === null && (
        <p className="mt-4 text-sm text-slate-500">{missingScoreReason(conditions)}</p>
      )}

      <div className="mt-5 space-y-3">
        <MetricRow
          icon={<WaveIcon />}
          label="Wave height"
          value={formatValue(conditions.waveHeight, "m")}
        />
        <MetricRow
          icon={<TimerIcon />}
          label="Wave period"
          value={formatValue(conditions.wavePeriod, "s")}
        />
        <MetricRow
          icon={<WindIcon />}
          label="Wind speed"
          value={formatValue(conditions.windSpeed, "km/h")}
        />
        <MetricRow
          icon={<CompassIcon />}
          label="Wind direction"
          value={degreesToCompass(conditions.windDirection)}
        />
      </div>

      <p
        className={`mt-5 border-t border-ocean-100/80 pt-4 text-xs ${
          isStaleTimestamp(conditions.lastUpdatedAt, 2 * 60 * 60 * 1000)
            ? "text-amber-700"
            : "text-slate-500"
        }`}
      >
        {formatUpdatedTime(conditions.lastUpdatedAt)}
      </p>
    </div>
  );
}
