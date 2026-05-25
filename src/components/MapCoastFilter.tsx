"use client";

import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BeachCardData } from "@/types/beach";
import { CoastPills } from "@/components/CoastPills";
import { coastToQueryParam, parseCoastFromQuery, type CoastFilter } from "@/lib/coast-filter";

const BeachMap = dynamic(() => import("@/components/BeachMap"), { ssr: false });

type Props = {
  beachCards: BeachCardData[];
};

export function MapCoastFilter({ beachCards }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const coastParam = searchParams.get("coast");
  const coastFilterFromUrl = useMemo(() => parseCoastFromQuery(coastParam), [coastParam]);

  const [coastFilter, setCoastFilter] = useState<CoastFilter>(() =>
    parseCoastFromQuery(coastParam)
  );

  useEffect(() => {
    setCoastFilter((current) => (current === coastFilterFromUrl ? current : coastFilterFromUrl));
  }, [coastFilterFromUrl]);

  const filteredBeaches = useMemo(() => {
    if (coastFilter === "All") {
      return beachCards;
    }
    return beachCards.filter((b) => b.coast === coastFilter);
  }, [beachCards, coastFilter]);

  const updateCoastFilter = (next: CoastFilter) => {
    setCoastFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    const q = coastToQueryParam(next);
    if (q === null) {
      params.delete("coast");
    } else {
      params.set("coast", q);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <CoastPills
        activeCoast={coastFilter}
        onChange={updateCoastFilter}
        className="mt-0 mb-4"
      />
      <BeachMap beachCards={filteredBeaches} />
    </>
  );
}
