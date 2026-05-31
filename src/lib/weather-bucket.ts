export type WeatherBucket = "clear" | "partlyCloudy" | "cloudy" | "rainShowers" | "thunderstorm";

export function weatherBucket(code: number | null): WeatherBucket {
  if (code === null || Number.isNaN(code)) {
    return "cloudy";
  }
  const c = Math.trunc(code);
  if (c >= 95 && c <= 99) {
    return "thunderstorm";
  }
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c === 50) {
    return "rainShowers";
  }
  if (c === 0 || c === 1) {
    return "clear";
  }
  if (c === 2 || c === 3) {
    return "partlyCloudy";
  }
  return "cloudy";
}
