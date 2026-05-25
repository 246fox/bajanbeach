export const COAST_FILTERS = ["All", "North", "West", "South", "Southeast", "East"] as const;

export type CoastFilter = (typeof COAST_FILTERS)[number];

export const COAST_QUERY_TO_FILTER: Record<string, CoastFilter> = {
  all: "All",
  north: "North",
  west: "West",
  south: "South",
  southeast: "Southeast",
  east: "East"
};

export function parseCoastFromQuery(value: string | null): CoastFilter {
  if (!value) {
    return "All";
  }
  return COAST_QUERY_TO_FILTER[value.toLowerCase()] ?? "All";
}

/** Lowercase `coast` query value, or `null` when filter is "All" (param should be removed). */
export function coastToQueryParam(filter: CoastFilter): string | null {
  if (filter === "All") {
    return null;
  }
  return filter.toLowerCase();
}
