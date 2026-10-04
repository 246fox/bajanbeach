"use client";

import { trackEvent } from "@/lib/analytics";
import type { BeachStayLink } from "@/types/beach";

type BeachStayLinksProps = {
  beachName: string;
  slug: string;
  links: BeachStayLink[];
};

function HotelsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 18V9.5M3 18h18M21 18v-4.5M3 11h18v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11V8.5A1.5 1.5 0 0 1 7.5 7h3A1.5 1.5 0 0 1 12 8.5V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VillasIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 11.5 12 4l8 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.5V20h12v-9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20v-5h4v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivitiesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v1.2a1.8 1.8 0 0 0 0 3.6v1.2A1.5 1.5 0 0 1 18.5 16h-13A1.5 1.5 0 0 1 4 14.5v-1.2a1.8 1.8 0 0 0 0-3.6V8.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1.5 2"
      />
    </svg>
  );
}

function titleFor(kind: BeachStayLink["kind"], beachName: string): string {
  switch (kind) {
    case "hotels":
      return `Hotels on and near ${beachName}`;
    case "villas":
      return "Villas and holiday homes";
    case "activities":
      return "Things to do nearby";
  }
}

function IconForKind({ kind }: { kind: BeachStayLink["kind"] }) {
  switch (kind) {
    case "hotels":
      return <HotelsIcon />;
    case "villas":
      return <VillasIcon />;
    case "activities":
      return <ActivitiesIcon />;
  }
}

export function BeachStayLinks({ beachName, slug, links }: BeachStayLinksProps) {
  if (links.length === 0) {
    return null;
  }

  const heading = links.some((link) => link.hotelName)
    ? "Stay on this beach"
    : "Stay near this beach";

  return (
    <section className="rounded-2xl border border-ocean-100/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-slate-800">{heading}</h2>
      {links.map((link) => {
        const title = link.hotelName
          ? `Stay at ${link.hotelName}`
          : titleFor(link.kind, beachName);
        const subtitle = `Book on ${link.provider} · opens in a new tab`;

        return (
          <a
            key={`${link.kind}-${link.provider}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mt-4 flex items-center gap-4 rounded-xl border border-ocean-100/80 bg-slate-50/80 p-4 transition hover:border-ocean-200 hover:bg-ocean-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2"
            onClick={() =>
              trackEvent("select_stay_link", {
                beach_slug: slug,
                link_type: link.kind,
                provider: link.provider
              })
            }
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean-100 text-ocean-700">
              <IconForKind kind={link.kind} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-800">{title}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span>
            </span>
          </a>
        );
      })}
      <p className="mt-4 text-xs text-slate-500">
        We may earn a commission if you book through these links, at no extra cost to you. It never
        affects the conditions or scores on this site.
      </p>
    </section>
  );
}
