"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailyWavePoint } from "@/lib/wave-forecast";

export function WaveForecastChart({ data }: { data: DailyWavePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-ocean-100/80 bg-white/80 px-4 py-8 text-center text-sm text-slate-600">
        Wave forecast is temporarily unavailable.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    waveHeightM: Math.round(d.waveHeightM * 100) / 100
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dee8ef" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            domain={[0, "auto"]}
            width={44}
            label={{
              value: "m",
              position: "insideTopLeft",
              offset: 4,
              fill: "#64748b",
              fontSize: 11
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid #dff1fb",
              fontSize: "0.875rem"
            }}
            formatter={(value: unknown) => {
              const n = typeof value === "number" ? value : Number(value);
              const text = Number.isFinite(n) ? `${n.toFixed(2)} m` : "—";
              return [text, "Max wave height"];
            }}
          />
          <Line
            type="monotone"
            dataKey="waveHeightM"
            stroke="#4aa3d8"
            strokeWidth={2.5}
            dot={{ fill: "#2f6f98", r: 4 }}
            activeDot={{ r: 6 }}
            name="Wave height"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
