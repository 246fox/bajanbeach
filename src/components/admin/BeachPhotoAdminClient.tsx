"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearBeachPhotoOverride,
  saveBeachPhotoOverride,
  uploadBeachHeroPhoto
} from "@/app/admin/photos/actions";
import type { BeachPhotoOverrideData } from "@/lib/beach-photo-overrides";

export type BeachPhotoAdminRow = {
  slug: string;
  name: string;
  parish: string;
  coast: string;
  override: BeachPhotoOverrideData | null;
  googlePhotoRefs: string[];
};

function thumbSrc(ref: string): string {
  return `/api/admin/places-photo?ref=${encodeURIComponent(ref)}&maxPx=400`;
}

function BeachPhotoPickerRow({ row }: { row: BeachPhotoAdminRow }) {
  const { slug, name, parish, coast, override, googlePhotoRefs } = row;
  const router = useRouter();
  const storedGoogleRef =
    override?.source === "google_ref" ? override.photo_reference?.trim() ?? "" : "";
  const storedImageUrl = override?.source === "upload" ? override.image_url?.trim() ?? "" : "";

  const [pendingRef, setPendingRef] = useState<string | null>(
    override?.source === "google_ref" ? override.photo_reference : null
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingRef(override?.source === "google_ref" ? override.photo_reference : null);
  }, [override]);

  const hasOverride = Boolean(override);
  const overrideInCurrentGallery =
    Boolean(storedGoogleRef) && googlePhotoRefs.some((r) => r.trim() === storedGoogleRef);

  const pendingTrim = pendingRef?.trim() ?? "";
  const saveDisabled =
    isPending ||
    pendingTrim === "" ||
    (override?.source === "google_ref" && pendingTrim === storedGoogleRef);

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
          {!hasOverride ? (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              Google default
            </span>
          ) : override?.source === "upload" ? (
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900 ring-1 ring-violet-200">
              Your photo
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
              Google pick
            </span>
          )}
        </div>
      </div>

      {storedImageUrl ? (
        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
          <p className="text-sm font-semibold text-violet-950">Current custom photo (live on site)</p>
          <div className="mt-3 inline-block overflow-hidden rounded-lg border-2 border-violet-500 ring-2 ring-violet-400/40">
            <img
              src={storedImageUrl}
              alt=""
              className="aspect-video w-[min(100%,320px)] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <h3 className="mt-6 text-sm font-semibold text-slate-700">Upload your own photo</h3>
      <p className="mt-1 text-xs text-slate-600">
      JPEG, PNG, or WebP — max 5MB. Saved as JPEG in Supabase Storage (stable URL; no Google drift).
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="max-w-full text-sm text-slate-700 file:mr-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800"
          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={isPending || !uploadFile}
          onClick={() => {
            if (!uploadFile) {
              return;
            }
            startTransition(async () => {
              setError(null);
              const fd = new FormData();
              fd.append("slug", slug);
              fd.append("photo", uploadFile);
              const res = await uploadBeachHeroPhoto(fd);
              if (res.error) {
                setError(res.error);
              } else {
                setUploadFile(null);
                if (uploadInputRef.current) {
                  uploadInputRef.current.value = "";
                }
                router.refresh();
              }
            });
          }}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Upload custom photo
        </button>
      </div>

      <h3 className="mt-8 text-sm font-semibold text-slate-700">Google Places photos (all returned)</h3>
      {hasOverride && override?.source === "google_ref" && !overrideInCurrentGallery ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
          <p className="text-sm font-medium text-amber-950">
            Live Google pick (not in current gallery list)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
            Google sometimes returns different photo resource IDs than when you saved. The site still uses your
            stored ID for the public hero. Pick a thumbnail below and save to re-pin a current ID, upload your
            own photo, or clear the override.
          </p>
          <div className="mt-3 inline-block overflow-hidden rounded-lg border-2 border-emerald-600 ring-2 ring-emerald-500/50">
            <img
              src={thumbSrc(storedGoogleRef)}
              alt="Current Google override preview"
              className="aspect-video w-[min(100%,280px)] object-cover"
              loading="lazy"
            />
          </div>
          <p className="mt-2 font-mono text-[10px] leading-snug text-amber-950/80 break-all">
            Stored: {storedGoogleRef.slice(0, 120)}
            {storedGoogleRef.length > 120 ? "…" : ""}
          </p>
        </div>
      ) : null}
      {googlePhotoRefs.length === 0 ? (
        <p className="mt-2 text-sm text-amber-800">No photos returned for this place (check API quota or search match).</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {googlePhotoRefs.map((ref, index) => {
            const refNorm = ref.trim();
            const isLiveOverride = Boolean(storedGoogleRef) && refNorm === storedGoogleRef;
            const pendingNorm = pendingRef?.trim() ?? "";
            const isPendingChange =
              pendingNorm === refNorm && (storedGoogleRef === "" || refNorm !== storedGoogleRef);
            const ringClass = isLiveOverride
              ? "border-emerald-500 ring-4 ring-emerald-500/90 ring-offset-2 ring-offset-white"
              : isPendingChange
                ? "border-ocean-500 ring-4 ring-ocean-500/80 ring-offset-2 ring-offset-white"
                : "border-transparent hover:border-slate-300";
            return (
              <button
                key={ref}
                type="button"
                onClick={() => {
                  setPendingRef(ref);
                  setError(null);
                }}
                className={`group relative overflow-hidden rounded-lg border-2 bg-slate-100 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 ${ringClass}`}
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
                {isLiveOverride ? (
                  <span className="absolute bottom-1 right-1 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    Current
                  </span>
                ) : null}
                {isPendingChange && !isLiveOverride ? (
                  <span className="absolute bottom-1 right-1 rounded bg-ocean-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    Selected
                  </span>
                ) : null}
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
            if (pendingTrim === "") {
              return;
            }
            startTransition(async () => {
              setError(null);
              const res = await saveBeachPhotoOverride(slug, pendingTrim);
              if (res.error) {
                setError(res.error);
              } else {
                router.refresh();
              }
            });
          }}
          className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ocean-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
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
