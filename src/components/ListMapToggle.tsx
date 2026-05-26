"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ACTIVE =
  "rounded-full bg-ocean-100 px-4 py-2 text-sm font-semibold text-ocean-700 ring-1 ring-ocean-200";
const INACTIVE =
  "rounded-full px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50";

export function ListMapToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const listHref = qs ? `/?${qs}` : "/";
  const mapHref = qs ? `/map?${qs}` : "/map";

  const listActive = pathname === "/";
  const mapActive = pathname === "/map";

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Link href={listHref} className={listActive ? ACTIVE : INACTIVE} scroll={false}>
        List
      </Link>
      <Link href={mapHref} className={mapActive ? ACTIVE : INACTIVE} scroll={false}>
        Map
      </Link>
    </div>
  );
}
