import Link from "next/link";
import { BeachPhotoAdminClient, type BeachPhotoAdminRow } from "@/components/admin/BeachPhotoAdminClient";
import { beaches, getBeachBySlug } from "@/data/beaches";
import { PRIORITY_BEACH_SLUGS } from "@/lib/admin-photo-priority";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAllBeachPhotoOverrides } from "@/lib/beach-photo-overrides";
import { getGooglePlacePhotoReferences } from "@/lib/beach-photos";
import type { Beach } from "@/types/beach";

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      results[i] = await mapper(items[i], i);
    }
  }

  const pool = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

export default async function AdminPhotosPage({
  searchParams
}: {
  searchParams: { filter?: string };
}) {
  await requireAdminSession();

  const filter = searchParams.filter === "priority" ? "priority" : "all";

  const beachList: Beach[] =
    filter === "priority"
      ? PRIORITY_BEACH_SLUGS.map((slug) => getBeachBySlug(slug)).filter((b): b is Beach => Boolean(b))
      : [...beaches].sort((a, b) => a.name.localeCompare(b.name));

  const overrides = await fetchAllBeachPhotoOverrides();

  const rows: BeachPhotoAdminRow[] = await mapWithConcurrency(beachList, 6, async (beach) => {
    const googlePhotoRefs = await getGooglePlacePhotoReferences(beach.name);
    return {
      slug: beach.slug,
      name: beach.name,
      parish: beach.parish,
      coast: beach.coast,
      savedOverrideRef: overrides.get(beach.slug) ?? null,
      googlePhotoRefs
    };
  });

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-slate-800">Beach photo overrides</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Pick the thumbnail that best matches each beach. Changes apply on the public site after save. Use{" "}
            <strong>Clear override</strong> to revert to Google&apos;s default first photo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/photos?filter=all"
              className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                filter === "all"
                  ? "bg-ocean-600 text-white ring-ocean-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              All beaches (A–Z)
            </Link>
            <Link
              href="/admin/photos?filter=priority"
              className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                filter === "priority"
                  ? "bg-ocean-600 text-white ring-ocean-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              Priority only (16)
            </Link>
          </div>
        </div>
      </div>

      <BeachPhotoAdminClient rows={rows} />

      <p className="pb-10 text-center text-sm text-slate-500">
        <Link href="/admin/sargassum" className="text-ocean-700 hover:text-ocean-600">
          Sargassum admin
        </Link>
        {" · "}
        <Link href="/" className="text-ocean-700 hover:text-ocean-600">
          ← Back to site
        </Link>
      </p>
    </>
  );
}
