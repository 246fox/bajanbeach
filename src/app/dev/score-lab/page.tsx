import { notFound } from "next/navigation";
import { beaches } from "@/data/beaches";
import { ScoreLabClient } from "./score-lab-client";
import type { ScoreLabBeach } from "./types";

export const metadata = {
  title: "Score lab (dev)",
  robots: { index: false, follow: false } as const
};

export default function ScoreLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const payload: ScoreLabBeach[] = beaches.map((b) => ({
    name: b.name,
    slug: b.slug,
    coast: b.coast,
    seaState: b.seaState,
    waveActionBaseline: b.waveActionBaseline,
    isSurfSpot: b.isSurfSpot
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ScoreLabClient beaches={payload} />
    </div>
  );
}
