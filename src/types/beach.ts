export type BeachCoast = "North" | "West" | "South" | "Southeast" | "East";

export type BeachType = "calm" | "moderate" | "surf";

export type SwellTolerance = "low" | "medium" | "high";

export type Beach = {
  name: string;
  slug: string;
  parish: string;
  latitude: number;
  longitude: number;
  coast: BeachCoast;
  type: BeachType;
  swellTolerance: SwellTolerance;
  webcamUrl: string;
  description: string;
  bestFor: string;
  notes: string;
};

export type BeachConditions = {
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  swimScore: number | null;
  lastUpdatedAt: string | null;
};

export type BeachCardData = Beach & {
  conditions: BeachConditions;
  photoUrl: string | null;
  heroClass: string;
};
