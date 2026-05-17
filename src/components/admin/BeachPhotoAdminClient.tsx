"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  clearBeachPhotoOverride,
  saveBeachPhotoOverride,
  scanBrokenGooglePhotoOverrides,
  uploadBeachHeroPhoto,
  type BrokenPhotoScanResult
} from "@/app/admin/photos/actions";
import type { BeachPhotoOverrideData } from "@/lib/beach-photo-overrides";

export type AdminPhotoFilter = "all" | "drift-risk" | "stable" | "broken";

const BROKEN_SCAN_STORAGE_KEY = "admin-photo-broken-scan";
const INITIAL_GALLERY_THUMBS = 5;

export type BeachPhotoAdminRow = {
  slug: string;
  name: string;
  parish: string;
  coast: string;
  override: BeachPhotoOverrideData | null;
  googlePhotoRefs: string[];
  /** When true, gallery loads via Intersection Observer (All view only). */
  lazyLoadGallery: boolean;
};

type PhotoSourceKind = "default" | "upload" | "google_ref";

function photoSourceKind(override: BeachPhotoOverrideData | null): PhotoSourceKind {
  if (!override) {
    return "default";
  }
  return override.source === "upload" ? "upload" : "google_ref";
}

function sourceBadge(kind: PhotoSourceKind) {
  if (kind === "upload") {
    return (
      <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900 ring-1 ring-violet-200">
        Uploaded
      </span>
    );
  }
  if (kind === "google_ref") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
        Google pick
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      Default
    </span>
  );
}

function thumbSrc(ref: string): string {
  return `/api/admin/places-photo?ref=${encodeURIComponent(ref)}&maxPx=400`;
}

async function fetchGalleryRefs(slug: string): Promise<string[]> {
  const res = await fetch(`/api/admin/beach-google-photos?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) {
    throw new Error(`Gallery fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { googlePhotoRefs?: string[] };
  return data.googlePhotoRefs ?? [];
}

type GalleryLoadState = "idle" | "loading" | "loaded" | "error";

function BeachPhotoPickerRow({
  row,
  showGoogleGallery,
  forceLoadGallery,
  driftStatus
}: {
  row: BeachPhotoAdminRow;
  showGoogleGallery: boolean;
  forceLoadGallery: boolean;
  driftStatus?: "broken" | "unverified" | null;
}) {
  const { slug, name, parish, coast, override, lazyLoadGallery } = row;
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const sourceKind = photoSourceKind(override);
  const isUploadOverride = sourceKind === "upload";

  const [googlePhotoRefs, setGooglePhotoRefs] = useState(row.googlePhotoRefs);
  const [galleryState, setGalleryState] = useState<GalleryLoadState>(() =>
    row.googlePhotoRefs.length > 0 ? "loaded" : "idle"
  );
  const [showAllGalleryPhotos, setShowAllGalleryPhotos] = useState(false);
  const [browseGooglePhotos, setBrowseGooglePhotos] = useState(false);
  const googleGalleryEnabled = showGoogleGallery && (!isUploadOverride || browseGooglePhotos);

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

  const expandIfSavedPickBeyondInitial = useCallback(
    (refs: string[]) => {
      if (!storedGoogleRef) {
        return;
      }
      const savedIndex = refs.findIndex((r) => r.trim() === storedGoogleRef);
      if (savedIndex >= INITIAL_GALLERY_THUMBS) {
        setShowAllGalleryPhotos(true);
      }
    },
    [storedGoogleRef]
  );

  useEffect(() => {
    setGooglePhotoRefs(row.googlePhotoRefs);
    setGalleryState(row.googlePhotoRefs.length > 0 ? "loaded" : "idle");
    setShowAllGalleryPhotos(false);
    setBrowseGooglePhotos(false);
    if (row.googlePhotoRefs.length > 0) {
      expandIfSavedPickBeyondInitial(row.googlePhotoRefs);
    }
  }, [row.googlePhotoRefs, row.slug, expandIfSavedPickBeyondInitial]);

  useEffect(() => {
    setPendingRef(override?.source === "google_ref" ? override.photo_reference : null);
  }, [override]);

  const loadGallery = useCallback(async () => {
    if (galleryState === "loading" || galleryState === "loaded") {
      return;
    }
    setGalleryState("loading");
    try {
      const refs = await fetchGalleryRefs(slug);
      setGooglePhotoRefs(refs);
      setGalleryState("loaded");
      expandIfSavedPickBeyondInitial(refs);
    } catch {
      setGalleryState("error");
    }
  }, [galleryState, slug, expandIfSavedPickBeyondInitial]);

  useEffect(() => {
    if (browseGooglePhotos && galleryState === "idle" && !lazyLoadGallery) {
      void loadGallery();
    }
  }, [browseGooglePhotos, galleryState, lazyLoadGallery, loadGallery]);

  useEffect(() => {
    if (!googleGalleryEnabled) {
      return;
    }
    if (forceLoadGallery) {
      void loadGallery();
      return;
    }
    if (!lazyLoadGallery || galleryState !== "idle") {
      return;
    }

    const el = sectionRef.current;
    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          void loadGallery();
        }
      },
      { rootMargin: "240px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [googleGalleryEnabled, forceLoadGallery, lazyLoadGallery, galleryState, loadGallery]);

  const hasMoreGalleryPhotos = googlePhotoRefs.length > INITIAL_GALLERY_THUMBS;
  const visibleGalleryRefs = showAllGalleryPhotos
    ? googlePhotoRefs
    : googlePhotoRefs.slice(0, INITIAL_GALLERY_THUMBS);

  const hasOverride = Boolean(override);
  const overrideInCurrentGallery =
    Boolean(storedGoogleRef) &&
    googlePhotoRefs.length > 0 &&
    googlePhotoRefs.some((r) => r.trim() === storedGoogleRef);

  const pendingTrim = pendingRef?.trim() ?? "";
  const saveDisabled =
    isPending ||
    pendingTrim === "" ||
    (override?.source === "google_ref" && pendingTrim === storedGoogleRef);

  return (
    <section ref={sectionRef} className="border-b border-slate-200 py-10 last:border-b-0">
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          {sourceBadge(sourceKind)}
          {driftStatus === "broken" ? (
            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 ring-1 ring-red-200">
              Broken — re-pick
            </span>
          ) : driftStatus === "unverified" ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-950 ring-1 ring-amber-200">
              Not verified
            </span>
          ) : sourceKind === "google_ref" && overrideInCurrentGallery ? (
            <span className="text-[10px] font-medium text-emerald-800">In gallery</span>
          ) : null}
        </div>
      </div>

      {storedImageUrl ? (
        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
          <p className="text-sm font-semibold text-violet-950">Current upload (live on site)</p>
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

      {sourceKind === "default" && !showGoogleGallery ? (
        <p className="mt-4 text-sm text-slate-600">
          No override — the site uses Google&apos;s current default hero. Open{" "}
          <Link href="/admin/photos?filter=all" className="font-medium text-ocean-700 hover:text-ocean-600">
            All beaches
          </Link>{" "}
          to pick a thumbnail or upload.
        </p>
      ) : null}

      {isUploadOverride && !browseGooglePhotos ? (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            Uploaded photo — not dependent on Google reference IDs.
          </p>
          {showGoogleGallery ? (
            <button
              type="button"
              className="mt-3 rounded-lg border border-ocean-200 bg-white px-4 py-2 text-sm font-semibold text-ocean-800 shadow-sm transition hover:border-ocean-300 hover:bg-ocean-50/80"
              onClick={() => setBrowseGooglePhotos(true)}
            >
              Browse Google photos
            </button>
          ) : null}
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

      {googleGalleryEnabled ? (
        <>
          <h3 className="mt-8 text-sm font-semibold text-slate-700">Google Places photos</h3>
          {lazyLoadGallery && galleryState === "idle" ? (
            <p className="mt-2 text-sm text-slate-500">Scroll here to load the gallery…</p>
          ) : null}
          {galleryState === "loading" ? (
            <p className="mt-2 text-sm text-slate-500">Loading gallery…</p>
          ) : null}
          {galleryState === "error" ? (
            <p className="mt-2 text-sm text-amber-800">
              Could not load gallery.{" "}
              <button
                type="button"
                className="font-medium text-ocean-700 underline hover:text-ocean-600"
                onClick={() => {
                  setGalleryState("idle");
                  void loadGallery();
                }}
              >
                Retry
              </button>
            </p>
          ) : null}

          {hasOverride && override?.source === "google_ref" && !overrideInCurrentGallery && galleryState === "loaded" ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
              <p className="text-sm font-medium text-amber-950">Saved pick not in current gallery</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                Google rotated photo resource IDs. The site still uses your stored ID. Pick a thumbnail
                below, upload your own, or clear the override.
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

          {galleryState === "loaded" && googlePhotoRefs.length === 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              No photos returned (quota, search match, or temporary API issue).
            </p>
          ) : null}

          {galleryState === "loaded" && googlePhotoRefs.length > 0 ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {visibleGalleryRefs.map((ref) => {
                const index = googlePhotoRefs.findIndex((r) => r.trim() === ref.trim());
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
              {hasMoreGalleryPhotos && !showAllGalleryPhotos ? (
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  onClick={() => setShowAllGalleryPhotos(true)}
                >
                  Show more photos
                </button>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {googleGalleryEnabled ? (
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
        </div>
      ) : null}

      {hasOverride ? (
        <div className={`flex flex-wrap gap-3 ${googleGalleryEnabled ? "mt-3" : "mt-4"}`}>
          <button
            type="button"
            disabled={isPending}
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
      ) : null}
    </section>
  );
}

function FilterPill({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
        active
          ? "bg-ocean-600 text-white ring-ocean-600"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}

export function BeachPhotoAdminClient({
  filter,
  rows,
  counts
}: {
  filter: AdminPhotoFilter;
  rows: BeachPhotoAdminRow[];
  counts: { all: number; driftRisk: number; stable: number };
}) {
  const router = useRouter();
  const [scan, setScan] = useState<BrokenPhotoScanResult | null>(null);
  const [scanPending, startScan] = useTransition();

  useEffect(() => {
    if (filter !== "broken") {
      return;
    }
    try {
      const raw = sessionStorage.getItem(BROKEN_SCAN_STORAGE_KEY);
      if (!raw) {
        setScan(null);
        return;
      }
      setScan(JSON.parse(raw) as BrokenPhotoScanResult);
    } catch {
      setScan(null);
    }
  }, [filter]);

  const runBrokenScan = () => {
    startScan(async () => {
      const result = await scanBrokenGooglePhotoOverrides();
      if ("error" in result) {
        return;
      }
      sessionStorage.setItem(BROKEN_SCAN_STORAGE_KEY, JSON.stringify(result));
      setScan(result);
      router.push("/admin/photos?filter=broken");
    });
  };

  const brokenSlugSet = new Set(scan?.brokenSlugs ?? []);
  const unverifiedSlugSet = new Set(scan?.unverifiedSlugs ?? []);

  let visibleRows = rows;
  if (filter === "broken" && scan) {
    visibleRows = rows.filter((r) => brokenSlugSet.has(r.slug));
  } else if (filter === "broken" && !scan) {
    visibleRows = [];
  }

  const showGoogleGallery = filter !== "stable";
  const forceLoadGallery = filter === "broken";

  return (
  <>
    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill href="/admin/photos?filter=drift-risk" active={filter === "drift-risk"}>
            Drift risk ({counts.driftRisk})
          </FilterPill>
          <FilterPill href="/admin/photos?filter=stable" active={filter === "stable"}>
            Stable ({counts.stable})
          </FilterPill>
          <FilterPill href="/admin/photos?filter=all" active={filter === "all"}>
            All beaches ({counts.all})
          </FilterPill>
          <FilterPill href="/admin/photos?filter=broken" active={filter === "broken"}>
            Broken now{scan ? ` (${scan.brokenSlugs.length})` : ""}
          </FilterPill>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={scanPending}
            onClick={runBrokenScan}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
          >
            {scanPending ? "Scanning…" : "Check broken Google picks"}
          </button>
          <p className="text-xs text-slate-600">
            Compares saved Google IDs to today&apos;s gallery. Metadata only during scan — no thumbnails
            until you view rows.
          </p>
        </div>
        {scan ? (
          <p className="mt-2 text-xs text-slate-500">
            Last scan: {new Date(scan.scannedAt).toLocaleString()} — {scan.okCount} OK,{" "}
            {scan.brokenSlugs.length} broken, {scan.unverifiedSlugs.length} not verified (empty gallery).
          </p>
        ) : null}
      </div>
    </div>

    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {filter === "broken" && !scan ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-700">Run a scan to see beaches whose saved Google pick has drifted.</p>
          <button
            type="button"
            disabled={scanPending}
            onClick={runBrokenScan}
            className="mt-4 rounded-lg bg-ocean-700 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-600 disabled:opacity-50"
          >
            Check broken Google picks
          </button>
        </div>
      ) : null}

      {filter === "broken" && scan && visibleRows.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900">
          No broken Google picks in the last scan.
        </p>
      ) : null}

      <div className="space-y-10">
        {visibleRows.map((row) => (
          <BeachPhotoPickerRow
            key={row.slug}
            row={row}
            showGoogleGallery={showGoogleGallery}
            forceLoadGallery={forceLoadGallery}
            driftStatus={
              brokenSlugSet.has(row.slug)
                ? "broken"
                : unverifiedSlugSet.has(row.slug)
                  ? "unverified"
                  : null
            }
          />
        ))}
      </div>
    </div>
  </>
  );
}
