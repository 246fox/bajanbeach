import type { Beach } from "@/types/beach";

export type ScoreLabBeach = Pick<
  Beach,
  "name" | "slug" | "coast" | "seaState" | "waveActionBaseline" | "isSurfSpot"
>;
