import Link from "next/link";
import {
  BeachPhotoAdminClient,
  type AdminPhotoFilter,
  type BeachPhotoAdminRow
} from "@/components/admin/BeachPhotoAdminClient";
import { beaches } from "@/data/beaches";
import { requireAdminSession } from "@/lib/admin-session";
import { fetchAllBeachPhotoOverrides } from "@/lib/beach-photo-overrides";
import { getGooglePlacePhotoReferences } from "@/lib/beach-photos";
import type { Beach } from "@/types/beach";

function parseFilter(raw?: string): AdminPhotoFilter {
  if (raw === "all" || raw === "stable" || raw === "broken") {
    return raw;
  }
  return "drift-risk";
}

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

function buildRow(
  beach: Beach,
  override: BeachPhotoAdminRow["override"],
  googlePhotoRefs: string[],
  lazyLoadGallery: boolean
): BeachPhotoAdminRow {
  return {
    slug: beach.slug,
    name: beach.name,
    parish: beach.parish,
    coast: beach.coast,
    override,
    googlePhotoRefs,
    lazyLoadGallery
  };
}

export default async function AdminPhotosPage({
  searchParams
}: {
  searchParams: { filter?: string };
}) {
  await requireAdminSession();

  const filter = parseFilter(searchParams.filter);
  const overrides = await fetchAllBeachPhotoOverrides();
  const allBeaches = [...beaches].sort((a, b) => a.name.localeCompare(b.name));

  const driftRiskBeaches = allBeaches.filter((b) => overrides.get(b.slug)?.source === "google_ref");
  const stableBeaches = allBeaches.filter((b) => {
    const o = overrides.get(b.slug);
    return !o || o.source === "upload";
  });

  const counts = {
    all: allBeaches.length,
    driftRisk: driftRiskBeaches.length,
    stable: stableBeaches.length
  };

  let beachList: Beach[];
  switch (filter) {
    case "all":
      beachList = allBeaches;
      break;
    case "stable":
      beachList = stableBeaches;
      break;
    case "broken":
      beachList = allBeaches;
      break;
    default:
      beachList = driftRiskBeaches;
      break;
  }

  const prefetchGallery = filter === "drift-risk";
  const lazyLoadGallery = filter === "all";

  const rows: BeachPhotoAdminRow[] = prefetchGallery
    ? await mapWithConcurrency(beachList, 6, async (beach) => {
        const googlePhotoRefs = await getGooglePlacePhotoReferences(beach);
        return buildRow(beach, overrides.get(beach.slug) ?? null, googlePhotoRefs, false);
      })
    : beachList.map((beach) =>
        buildRow(beach, overrides.get(beach.slug) ?? null, [], lazyLoadGallery)
      );

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-slate-800">Beach photo overrides</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Maintain hero photos: re-check <strong>Google picks</strong> when references drift, or{" "}
            <strong>upload</strong> your own (stable, no drift). <strong>Default</strong> beaches use
            Google&apos;s current first photo with no saved override.
          </p>
        </div>
      </div>

      <BeachPhotoAdminClient filter={filter} rows={rows} counts={counts} />

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
