"use client";

import { useState } from "react";
import type { BeachCoast } from "@/types/beach";
import { coastChipStyles } from "@/lib/beach-format";

type CoastIntro = {
  title: string;
  tagline: string;
  description: string;
  parishes: string;
  safety: string;
};

const COAST_INTROS: Record<BeachCoast, CoastIntro> = {
  West: {
    title: "West Coast",
    tagline: "The Platinum Coast",
    description:
      "The leeward side. Calm turquoise water, white sand, reef-protected swimming. Home to the island's luxury resorts and the best sunsets. Best for families, snorkelling, calm swimming, and dining at world-class beach restaurants.",
    parishes: "St. Peter, St. James, St. Michael",
    safety: "Generally safe for all swimmers"
  },
  South: {
    title: "South Coast",
    tagline: "The Lively Coast",
    description:
      "A transitional zone where the Caribbean meets the Atlantic. Moderate swells make it ideal for windsurfing, kitesurfing, and bodyboarding. Home to Barbados' nightlife scene, the Friday Night Fish Fry, and the busiest tourist beaches.",
    parishes: "St. Michael, Christ Church",
    safety: "Confident swimmers, watersports"
  },
  Southeast: {
    title: "Southeast Coast",
    tagline: "The Dramatic Coast",
    description:
      "Towering limestone cliffs, pink-tinged sand, secluded coves. Less for swimming, more for jaw-dropping photography and intimate moments. Includes Barbados' most photographed beach (Bottom Bay) and the iconic Crane.",
    parishes: "St. Philip",
    safety: "Caution required — strong currents"
  },
  East: {
    title: "East Coast",
    tagline: "The Atlantic Coast",
    description:
      "The wild side. Open Atlantic, world-class surf at Soup Bowl, mushroom rocks at Bathsheba. Generally NOT safe for swimming — but the most dramatic scenery on the island. Bath Beach is the only safe-swim option.",
    parishes: "St. Joseph, St. Andrew, St. John",
    safety: "Surfers and photographers"
  },
  North: {
    title: "North Coast",
    tagline: "The Cliffs",
    description:
      "Massive limestone uplift dropping into churning Atlantic. Cave systems, blowholes, and hidden bays accessed only by adventurous travel. No swimming, but the most spectacular natural geology on the island.",
    parishes: "St. Lucy",
    safety: "Photography and exploration only"
  }
};

function ParishIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SafetyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M12 3 2.5 20h19L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M3 13c2.5-2 4.5-2 6 0s3.5 2 6 0 4.5-2 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M3 18c2.5-2 4.5-2 6 0s3.5 2 6 0 4.5-2 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CoastIntroBanner({ coast, count }: { coast: BeachCoast; count: number }) {
  const intro = COAST_INTROS[coast];
  const [expanded, setExpanded] = useState(false);
  const chipStyles = coastChipStyles(coast);

  const beachWord = count === 1 ? "beach" : "beaches";

  return (
    <section
      aria-label={`${intro.title} introduction`}
      className="mt-8 overflow-hidden rounded-2xl border border-ocean-100/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8"
    >
      <p
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ring-inset ${chipStyles}`}
      >
        {coast} Coast
      </p>

      <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-800 sm:text-3xl">
        {intro.title}
        <span className="block text-base font-medium text-slate-500 sm:mt-0.5 sm:inline sm:pl-2">
          — {intro.tagline}
        </span>
      </h2>

      <p
        className={`mt-3 text-sm leading-6 text-slate-600 sm:line-clamp-none sm:text-base sm:leading-7 ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {intro.description}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2 text-sm font-medium text-ocean-700 underline-offset-2 hover:underline sm:hidden"
      >
        {expanded ? "Read less" : "Read more"}
      </button>

      <ul className="mt-5 flex flex-wrap gap-2">
        <li
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${chipStyles}`}
        >
          <ParishIcon />
          <span>{intro.parishes}</span>
        </li>
        <li
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${chipStyles}`}
        >
          <SafetyIcon />
          <span>{intro.safety}</span>
        </li>
        <li
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${chipStyles}`}
        >
          <CountIcon />
          <span>
            {count} {beachWord}
          </span>
        </li>
      </ul>
    </section>
  );
}
