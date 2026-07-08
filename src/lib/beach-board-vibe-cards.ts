import type { CoastFilter } from "@/lib/coast-filter";

export type VibeCard = {
  coast: Exclude<CoastFilter, "All">;
  vibe: string;
  beachName: string;
  slug: string;
  fallbackClass: string;
};

export const VIBE_CARDS: VibeCard[] = [
  {
    coast: "West",
    vibe: "Idyllic & Calm",
    beachName: "Heron Bay",
    slug: "heron-bay",
    fallbackClass: "bg-sky-300"
  },
  {
    coast: "South",
    vibe: "Lively & Active",
    beachName: "Carlisle Bay",
    slug: "carlisle-bay",
    fallbackClass: "bg-cyan-300"
  },
  {
    coast: "East",
    vibe: "Wild & Surfy",
    beachName: "Soup Bowl",
    slug: "soup-bowl",
    fallbackClass: "bg-blue-400"
  },
  {
    coast: "Southeast",
    vibe: "Dramatic & Secluded",
    beachName: "Bottom Bay",
    slug: "bottom-bay",
    fallbackClass: "bg-indigo-400"
  },
  {
    coast: "North",
    vibe: "Rugged & Adventurous",
    beachName: "Animal Flower Cave",
    slug: "animal-flower-cave",
    fallbackClass: "bg-teal-400"
  }
];
