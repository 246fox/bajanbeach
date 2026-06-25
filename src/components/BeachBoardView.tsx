"use client";

import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import Image from "next/image";
import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import { formatDistanceKm, haversineKm } from "@/lib/distance";
import { BeachSearchInput } from "@/components/BeachSearchInput";
import { BeachCard } from "@/components/BeachCard";
import { CoastIntroBanner } from "@/components/CoastIntroBanner";
import { CoastPills } from "@/components/CoastPills";
import type { CoastFilter } from "@/lib/coast-filter";
import { BEACH_BOARD_SORT_OPTIONS, type BeachBoardSortOption } from "@/lib/beach-board-display";
import { VIBE_CARDS, type VibeCard } from "@/lib/beach-board-vibe-cards";
import { isSupabaseStorageUrl } from "@/lib/is-supabase-storage-url";
import type { BeachCardData, BeachCoast } from "@/types/beach";

export type BeachBoardViewProps = {
  displayedCards: BeachCardData[];
  countsByCoast: Record<BeachCoast, number>;
  photoBySlug: Map<string, string | null>;
  coastFilter: CoastFilter;
  sortOption: BeachBoardSortOption;
  searchQuery: string;
  userCoords: { lat: number; lng: number } | null;
  locationError: string | null;
  listMapToggle: ReactNode;
  onSearchQueryChange: (value: string) => void;
  onSortSelectChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onCoastPillChange: (next: CoastFilter) => void;
  /** Interactive only: track + preventDefault + client filter/scroll. Omitted in static shell. */
  onVibeTileClick?: (event: MouseEvent<HTMLAnchorElement>, card: VibeCard) => void;
};

export function BeachBoardView({
  displayedCards,
  countsByCoast,
  photoBySlug,
  coastFilter,
  sortOption,
  searchQuery,
  userCoords,
  locationError,
  listMapToggle,
  onSearchQueryChange,
  onSortSelectChange,
  onCoastPillChange,
  onVibeTileClick
}: BeachBoardViewProps) {
  const searchActive = searchQuery.trim() !== "";

  const vibeAnchorProps = (card: VibeCard) =>
    onVibeTileClick
      ? {
          onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            onVibeTileClick(event, card);
          }
        }
      : {};

  return (
    <>
      <section className="mt-10 overflow-hidden rounded-3xl border border-ocean-100/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
          Pick your beach vibe
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Choose a coast style, then jump into matching beaches.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-6">
          {VIBE_CARDS.map((card, index) => {
            const photoUrl = photoBySlug.get(card.slug) ?? null;
            const desktopSpanClass = index < 3 ? "md:col-span-2" : "md:col-span-3";
            return (
              <a
                key={card.coast}
                href={`/?coast=${card.coast.toLowerCase()}`}
                {...vibeAnchorProps(card)}
                className={`group relative block overflow-hidden rounded-2xl border border-ocean-100/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 ${desktopSpanClass}`}
              >
                <div
                  className={`relative h-40 w-full overflow-hidden sm:h-44 md:h-48 ${photoUrl ? "" : card.fallbackClass}`}
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      priority={index === 0}
                      unoptimized={!isSupabaseStorageUrl(photoUrl)}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/25 to-slate-900/5 transition group-hover:from-slate-900/60" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <p className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-white/40">
                      {card.coast}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
                      {card.vibe}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">{card.beachName}</p>
                    {photoUrl === BEACH_PHOTO_PLACEHOLDER ? (
                      <p className="mt-1.5 text-[10px] font-normal tracking-wide text-white/45">
                        Photo unavailable
                      </p>
                    ) : null}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <div className="mt-10">{listMapToggle}</div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="beach-search" className="sr-only">
            Find a beach
          </label>
          <BeachSearchInput id="beach-search" value={searchQuery} onChange={onSearchQueryChange} />
          {searchActive && (
            <p className="text-xs text-slate-600" aria-live="polite">
              {displayedCards.length} beaches found
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col justify-center sm:w-72 lg:w-80">
          <label htmlFor="beach-sort" className="sr-only">
            Sort beaches
          </label>
          <div className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-ocean-100/80 bg-white px-3 py-2 shadow-sm focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-400/35">
            <span className="shrink-0 text-sm font-medium text-slate-600">Sort:</span>
            <select
              id="beach-sort"
              value={sortOption}
              onChange={onSortSelectChange}
              title="Sort beaches"
              className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
            >
              {BEACH_BOARD_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {locationError ? (
            <p className="mt-1.5 text-xs text-slate-600" aria-live="polite">
              {locationError}
            </p>
          ) : null}
        </div>
      </div>

      <CoastPills activeCoast={coastFilter} onChange={onCoastPillChange} />

      {coastFilter !== "All" && (
        <CoastIntroBanner key={coastFilter} coast={coastFilter} count={countsByCoast[coastFilter]} />
      )}

      <section id="beach-grid" className="mt-8 scroll-mt-8">
        {displayedCards.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">No beaches match your search</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedCards.map((beach) => (
              <BeachCard
                key={beach.slug}
                beach={beach}
                nearestDistanceLabel={
                  sortOption === "nearest" && userCoords
                    ? formatDistanceKm(
                        haversineKm(userCoords.lat, userCoords.lng, beach.latitude, beach.longitude)
                      )
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
