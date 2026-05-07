export type DailyWavePoint = {
  /** Chart label (short, local to Barbados) */
  label: string;
  /** Maximum hourly wave height for that calendar day (m) */
  waveHeightM: number;
};

type MarineHourlyResponse = {
  hourly?: {
    time?: string[];
    wave_height?: (number | null)[];
  };
};

/**
 * Seven calendar days of wave heights from Open-Meteo marine (max per day).
 */
export async function fetchSevenDayWaveForecast(
  latitude: number,
  longitude: number
): Promise<DailyWavePoint[]> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    "&hourly=wave_height&forecast_days=8&timezone=America/Barbados";

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as MarineHourlyResponse;
    const times = data.hourly?.time ?? [];
    const heights = data.hourly?.wave_height ?? [];
    if (times.length === 0) {
      return [];
    }

    const maxByDay = new Map<string, number>();

    for (let i = 0; i < times.length; i++) {
      const h = heights[i];
      if (h === null || h === undefined || Number.isNaN(h)) {
        continue;
      }
      const dayKey = times[i].slice(0, 10);
      const prev = maxByDay.get(dayKey);
      if (prev === undefined || h > prev) {
        maxByDay.set(dayKey, h);
      }
    }

    const sortedDays = [...maxByDay.keys()].sort();
    const labelFmt = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/Barbados"
    });

    const points: DailyWavePoint[] = sortedDays.slice(0, 7).map((dayKey) => {
      const waveHeightM = maxByDay.get(dayKey) ?? 0;
      const noonBarbadosAsUtc = new Date(`${dayKey}T16:00:00.000Z`);
      return {
        label: labelFmt.format(noonBarbadosAsUtc),
        waveHeightM
      };
    });

    return points;
  } catch {
    return [];
  }
}
