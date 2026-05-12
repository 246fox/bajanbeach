export type BeachCoast = "North" | "West" | "South" | "Southeast" | "East";

export type SeaState = "calm" | "moderate" | "rough";

export type WaveActionBaseline = "low" | "medium" | "high";

export type Beach = {
  name: string;
  slug: string;
  parish: string;
  latitude: number;
  longitude: number;
  coast: BeachCoast;
  seaState: SeaState;
  waveActionBaseline: WaveActionBaseline;
  isSurfSpot: boolean;
  webcamUrl: string;
  description: string;
  bestFor: string;
  notes: string;
  /** Set at runtime from Supabase by coast — never in static JSON. */
  sargassum?: SargassumDisplay;
};

export type BeachConditions = {
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  swimScore: number | null;
  lastUpdatedAt: string | null;
};

export type TidePhase = "rising" | "falling" | "high" | "low";

export type BeachTides = {
  phase: TidePhase | null;
  nextHighAt: string | null;
  nextHighHeightM: number | null;
  nextLowAt: string | null;
  nextLowHeightM: number | null;
};

export type SargassumDisplay =
  | { status: "ok"; level: "low" | "medium" | "high"; updatedAt: string }
  | { status: "unavailable" };

export type BeachCardData = Beach & {
  conditions: BeachConditions;
  photoUrl: string | null;
  heroClass: string;
};
