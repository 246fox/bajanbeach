import type { MetadataRoute } from "next";
import { beaches } from "@/data/beaches";

const BASE_URL = "https://bajanbeach.com";
const COAST_FILTERS = ["north", "west", "south", "southeast", "east"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: `${BASE_URL}/`,
    lastModified,
    changeFrequency: "daily",
    priority: 1.0
  };

  const beachEntries: MetadataRoute.Sitemap = beaches.map((beach) => ({
    url: `${BASE_URL}/beaches/${beach.slug}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.8
  }));

  const coastEntries: MetadataRoute.Sitemap = COAST_FILTERS.map((coast) => ({
    url: `${BASE_URL}/?coast=${coast}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  return [homeEntry, ...beachEntries, ...coastEntries];
}
