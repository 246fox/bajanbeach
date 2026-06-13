"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LIST_MAP_TOGGLE_ACTIVE_CLASS,
  LIST_MAP_TOGGLE_INACTIVE_CLASS
} from "@/components/list-map-toggle-styles";

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
      <Link
        href={listHref}
        className={listActive ? LIST_MAP_TOGGLE_ACTIVE_CLASS : LIST_MAP_TOGGLE_INACTIVE_CLASS}
        scroll={false}
      >
        List
      </Link>
      <Link
        href={mapHref}
        className={mapActive ? LIST_MAP_TOGGLE_ACTIVE_CLASS : LIST_MAP_TOGGLE_INACTIVE_CLASS}
        scroll={false}
      >
        Map
      </Link>
    </div>
  );
}
