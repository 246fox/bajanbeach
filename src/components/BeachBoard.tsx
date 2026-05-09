"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BeachCardData, BeachCoast } from "@/types/beach";
import {
  activityLabel,
  coastChipStyles,
  degreesToCompass,
  formatUpdatedTime,
  formatValue,
  isStaleTimestamp,
  missingScoreReason,
  scoreStyles,
  typeChipStyles
} from "@/lib/beach-format";
import { CoastIntroBanner } from "@/components/CoastIntroBanner";

const COAST_FILTERS = ["All", "North", "West", "South", "Southeast", "East"] as const;

type CoastFilter = (typeof COAST_FILTERS)[number];

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

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-ocean-600 transition-colors hover:text-ocean-700"
    >
      <path
        d="M4 7a2 2 0 0 1 2-2h1.5l1-1.5A2 2 0 0 1 10.2 3h3.6a2 2 0 0 1 1.7.95L16.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function BeachBoard({ beachCards }: { beachCards: BeachCardData[] }) {
  const router = useRouter();
  const [coastFilter, setCoastFilter] = useState<CoastFilter>("All");

  const visibleCards = useMemo(() => {
    if (coastFilter === "All") {
      return beachCards;
    }
    return beachCards.filter((b) => b.coast === coastFilter);
  }, [beachCards, coastFilter]);

  const countsByCoast = useMemo(() => {
    const counts: Record<BeachCoast, number> = {
      North: 0,
      West: 0,
      South: 0,
      Southeast: 0,
      East: 0
    };
    for (const b of beachCards) {
      counts[b.coast] += 1;
    }
    return counts;
  }, [beachCards]);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {COAST_FILTERS.map((label) => {
          const active = coastFilter === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setCoastFilter(label)}
              className={
                active
                  ? "rounded-full bg-ocean-500 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-2 ring-ocean-500 ring-offset-2 ring-offset-white"
                  : "rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {coastFilter !== "All" && (
        <CoastIntroBanner
          key={coastFilter}
          coast={coastFilter}
          count={countsByCoast[coastFilter]}
        />
      )}

      <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((beach) => (
          <article
            key={beach.slug}
            role="link"
            tabIndex={0}
            className="group h-full cursor-pointer overflow-hidden rounded-2xl border border-ocean-100/70 bg-white/75 shadow-sm backdrop-blur-sm transition hover:border-ocean-300/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2"
            onClick={() => router.push(`/beaches/${beach.slug}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/beaches/${beach.slug}`);
              }
            }}
          >
            <div
              className={`h-32 w-full ${beach.heroClass}`}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h2 className="text-xl font-semibold leading-snug text-slate-800">{beach.name}</h2>
                    {beach.webcamUrl.trim() !== "" && (
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 rounded-md p-0.5 hover:bg-ocean-50"
                        title="Live webcam"
                        aria-label={`Live webcam for ${beach.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(beach.webcamUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <CameraIcon />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{beach.parish}</p>
                </div>
                <p
                  className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreStyles(
                    beach.conditions.swimScore
                  )}`}
                >
                  {activityLabel(beach)} {beach.conditions.swimScore ?? "N/A"}/10
                </p>
              </div>
              {beach.conditions.swimScore === null && (
                <p className="text-xs text-slate-500">{missingScoreReason(beach.conditions)}</p>
              )}
              <p className="text-sm text-slate-600">{beach.description}</p>
              <p className="text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">Best for:</span> {beach.bestFor}
              </p>

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
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
              <p className="border-t border-slate-100 pt-3 text-xs italic leading-relaxed text-slate-500">
                {beach.notes}
              </p>
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
    </>
  );
}
