"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BeachProse } from "@/components/BeachProse";
import { SargassumBadge } from "@/components/SargassumBadge";
import {
  activityLabel,
  coastChipStyles,
  degreesToCompass,
  formatUpdatedTime,
  formatValue,
  formatScoreLabel,
  isStaleTimestamp,
  missingScoreReason,
  scoreStyles,
  seaStateChipStyles,
  seaStateLabel
} from "@/lib/beach-format";
import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import { trackEvent } from "@/lib/analytics";
import { isSupabaseStorageUrl } from "@/lib/is-supabase-storage-url";
import type { BeachCardData } from "@/types/beach";

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

function SurfSpotPill() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/90"
      title="Surf spot"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-500">
        <path
          d="M6 20c1.5-4 4-7 8-9l2 2c-2 4-5 6.5-9 8l-1-1Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 11c2-1 4-1.5 5.5-1M12 13c1.5 1.5 3 2.5 5 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Surf spot
    </span>
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

export function BeachCard({
  beach,
  nearestDistanceLabel
}: {
  beach: BeachCardData;
  nearestDistanceLabel?: string;
}) {
  return (
    <article
      className="group relative isolate h-full overflow-hidden rounded-2xl border border-ocean-100/70 bg-white/75 shadow-sm backdrop-blur-sm transition hover:border-ocean-300/80 hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ocean-400 focus-within:ring-offset-2"
    >
      <div className={`relative h-32 w-full overflow-hidden ${beach.heroClass}`}>
        {beach.photoUrl ? (
          <Image
            src={beach.photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
            unoptimized={!isSupabaseStorageUrl(beach.photoUrl)}
          />
        ) : null}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h2 className="text-xl font-semibold leading-snug text-slate-800">
                <Link
                  href={`/beaches/${beach.slug}`}
                  onClick={() =>
                    trackEvent("select_beach", { beach_slug: beach.slug, beach_name: beach.name })
                  }
                  className="text-inherit no-underline decoration-transparent outline-none ring-0 visited:text-inherit hover:text-inherit hover:no-underline hover:decoration-transparent focus:outline-none after:absolute after:inset-0 after:z-[1] after:content-['']"
                >
                  {beach.name}
                </Link>
              </h2>
              {beach.webcamUrl.trim() !== "" && (
                <button
                  type="button"
                  className="relative z-[2] mt-0.5 shrink-0 rounded-md p-0.5 hover:bg-ocean-50"
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
            {beach.photoUrl === BEACH_PHOTO_PLACEHOLDER ? (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">Photo unavailable</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreStyles(
                beach.conditions.swimScore
              )}`}
            >
              {activityLabel(beach)} {formatScoreLabel(beach.conditions.swimScore)}
            </p>
            {nearestDistanceLabel ? (
              <span className="text-xs text-slate-500">{nearestDistanceLabel}</span>
            ) : null}
          </div>
        </div>
        {beach.conditions.swimScore === null && (
          <p className="text-xs text-slate-500">{missingScoreReason(beach.conditions)}</p>
        )}
        <p className="text-sm text-slate-600">
          <BeachProse markdown={beach.description} linkOverlayClassName="relative z-[2]" />
        </p>
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
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${seaStateChipStyles(
              beach.seaState
            )}`}
          >
            {seaStateLabel(beach.seaState)}
          </span>
          {beach.isSurfSpot ? <SurfSpotPill /> : null}
        </div>
        {beach.sargassum && (
          <div className="pt-1">
            <SargassumBadge display={beach.sargassum} subtleUnavailable />
          </div>
        )}
        <p className="border-t border-slate-100 pt-3 text-xs italic leading-relaxed text-slate-500">
          <BeachProse markdown={beach.notes} linkOverlayClassName="relative z-[2]" />
        </p>
        {/* isStaleTimestamp uses Date.now(); suppressHydrationWarning avoids server/client text mismatch */}
        <p
          className={`pt-1 text-xs ${
            isStaleTimestamp(beach.conditions.lastUpdatedAt, 2 * 60 * 60 * 1000)
              ? "text-amber-700"
              : "text-slate-500"
          }`}
          suppressHydrationWarning
        >
          {formatUpdatedTime(beach.conditions.lastUpdatedAt)}
        </p>
      </div>
    </article>
  );
}
