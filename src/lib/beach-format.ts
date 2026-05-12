import type { Beach, BeachCoast, BeachConditions, SeaState } from "@/types/beach";

export function formatValue(value: number | null, unit: string, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${value.toFixed(digits)} ${unit}`;
}

export function degreesToCompass(degrees: number | null): string {
  if (degrees === null || Number.isNaN(degrees)) {
    return "N/A";
  }

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW"
  ];

  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

export function scoreStyles(score: number | null): string {
  if (score === null) {
    return "bg-slate-100 text-slate-600";
  }
  if (score > 7) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (score >= 4) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

export function formatScoreLabel(score: number | null): string {
  if (score === null) {
    return "Not available";
  }
  return `${score}/10`;
}

export function coastChipStyles(coast: BeachCoast): string {
  switch (coast) {
    case "North":
      return "bg-violet-100 text-violet-800 ring-violet-200";
    case "West":
      return "bg-sky-100 text-sky-700 ring-sky-200";
    case "South":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    case "Southeast":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    case "East":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
}

export function seaStateChipStyles(seaState: SeaState): string {
  if (seaState === "calm") {
    return "bg-sky-100 text-sky-700 ring-sky-200";
  }
  if (seaState === "moderate") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }
  return "bg-stone-100 text-stone-800 ring-stone-300";
}

export function seaStateLabel(seaState: SeaState): string {
  switch (seaState) {
    case "calm":
      return "Calm";
    case "moderate":
      return "Moderate";
    case "rough":
      return "Rough";
  }
}

export function missingScoreReason(conditions: BeachConditions): string | null {
  if (conditions.waveHeight === null && conditions.windSpeed === null) {
    return "Score unavailable: missing wave and wind data.";
  }
  if (conditions.waveHeight === null) {
    return "Score unavailable: missing wave data.";
  }
  if (conditions.windSpeed === null) {
    return "Score unavailable: missing wind data.";
  }
  return null;
}

export function formatUpdatedTime(timestamp: string | null): string {
  if (!timestamp) {
    return "Updated N/A";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Updated N/A";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Barbados",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);

  return `Updated ${formatted} AST`;
}

export function isStaleTimestamp(timestamp: string | null, maxAgeMs: number): boolean {
  if (!timestamp) {
    return false;
  }
  const updatedAt = new Date(timestamp).getTime();
  if (Number.isNaN(updatedAt)) {
    return false;
  }
  return Date.now() - updatedAt > maxAgeMs;
}

export function activityLabel(beach: Pick<Beach, "seaState">): string {
  if (beach.seaState === "rough") {
    return "Scenic";
  }
  return "Swim";
}
