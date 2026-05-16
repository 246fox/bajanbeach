"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clearBeachPhotoOverride, saveBeachPhotoOverride } from "@/app/admin/photos/actions";

export type BeachPhotoAdminRow = {
  slug: string;
  name: string;
  parish: string;
  coast: string;
  savedOverrideRef: string | null;
  googlePhotoRefs: string[];
};

function thumbSrc(ref: string): string {
  return `/api/admin/places-photo?ref=${encodeURIComponent(ref)}&maxPx=400`;
}

function BeachPhotoPickerRow({ row }: { row: BeachPhotoAdminRow }) {
  const { slug, name, parish, coast, savedOverrideRef, googlePhotoRefs } = row;
  const router = useRouter();
  const [pendingRef, setPendingRef] = useState<string | null>(savedOverrideRef);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingRef(savedOverrideRef);
  }, [savedOverrideRef]);

  const hasOverride = Boolean(savedOverrideRef);
  const saveDisabled =
    isPending ||
    pendingRef === null ||
    pendingRef === savedOverrideRef;

  return (
    <section className="border-b border-slate-200 py-10 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-800">{name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {parish} · {coast} coast
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{slug}</p>
          <Link
            href={`/beaches/${slug}`}
            className="mt-2 inline-block text-sm font-medium text-ocean-700 hover:text-ocean-600"
          >
            View on site →
          </Link>
        </div>
        <div className="shrink-0">
          {hasOverride ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
              Override set
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              Google default
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-slate-700">Google Places photos (all returned)</h3>
      {googlePhotoRefs.length === 0 ? (
        <p className="mt-2 text-sm text-amber-800">No photos returned for this place (check API quota or search match).</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {googlePhotoRefs.map((ref, index) => {
            const selected = pendingRef === ref;
            return (
              <button
                key={ref}
                type="button"
                onClick={() => {
                  setPendingRef(ref);
                  setError(null);
                }}
                className={`group relative overflow-hidden rounded-lg border-2 bg-slate-100 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 ${
                  selected ? "border-ocean-500 ring-2 ring-ocean-400/40" : "border-transparent hover:border-slate-300"
                }`}
              >
                <img
                  src={thumbSrc(ref)}
                  alt=""
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saveDisabled}
          onClick={() => {
            if (pendingRef === null) {
              return;
            }
            startTransition(async () => {
              setError(null);
              const res = await saveBeachPhotoOverride(slug, pendingRef);
              if (res.error) {
                setError(res.error);
              } else {
                router.refresh();
              }
            });
          }}
          className="rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save selection
        </button>
        <button
          type="button"
          disabled={isPending || !hasOverride}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await clearBeachPhotoOverride(slug);
              if (res.error) {
                setError(res.error);
              } else {
                setPendingRef(null);
                router.refresh();
              }
            });
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear override
        </button>
      </div>
    </section>
  );
}

export function BeachPhotoAdminClient({ rows }: { rows: BeachPhotoAdminRow[] }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="space-y-10">
        {rows.map((row) => (
          <BeachPhotoPickerRow key={row.slug} row={row} />
        ))}
      </div>
    </div>
  );
}
