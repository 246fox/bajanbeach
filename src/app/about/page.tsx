import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScoreFlow, SeaStateScale, SargassumScale, DataSources, ManchineelCallout } from "@/components/about/ScoreExplainer";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";

export const metadata: Metadata = {
  title: "About BajanBeach — How our beach scores work",
  description:
    "How BajanBeach scores swimming and scenic beaches, what calm/moderate/rough mean, how sargassum is tracked, and where wave and weather data come from.",
  alternates: {
    canonical: "/about"
  }
};

const JUMP_LINKS = [
  { label: "Swim & Scenic scores", href: "#scores" },
  { label: "Sea state", href: "#sea-state" },
  { label: "Sargassum", href: "#sargassum" },
  { label: "Our data", href: "#data" },
  { label: "Safety", href: "#safety" }
] as const;

function AboutCard({
  id,
  heading,
  children
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={ABOUT_CARD_CLASS}>
      <h2 className="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">{heading}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">About BajanBeach</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          BajanBeach is a free guide to conditions at beaches around Barbados. It pulls live wave, wind and tide
          data every hour, combines this with sargassum levels, and turns it into a simple read on whether today is
          a good day to visit a particular stretch of coast. This page explains what the scores mean, how to read
          sea state, and where the numbers come from.
        </p>
      </header>

      <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="On this page">
        {JUMP_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ocean-700 no-underline ring-1 ring-ocean-100/70 transition hover:bg-ocean-50/80 hover:ring-ocean-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        <AboutCard id="scores" heading="The score: Swim or Scenic">
          <ScoreFlow />
          <p>
            Every beach gets one score out of 10 for today, and what it measures depends on the beach. A swim score
            shows on calm and moderate beaches, for example the west and south coast swimming spots, and answers one
            thing: how good is the water for a swim right now? Higher means better.
          </p>
          <p>
            A scenic score shows on the rough Atlantic beaches, for example most of the east coast, where you go for
            the drama — not the swim. It asks whether today is a good day to make the trip out, leaning on weather,
            wind, sargassum and visibility rather than wave size. The score is a guide, not a promise — always trust
            your own eyes or a live webcam feed over a number.
          </p>
        </AboutCard>

        <AboutCard id="sea-state" heading="Sea state">
          <SeaStateScale />
          <p>
            Each beach has a sea state describing how its water generally behaves, relative to other Barbados beaches.
            It is not a promise that it will match your expectation on the day. Even the most sheltered west coast
            beach sits on the open ocean and will never be as still as a pool, and what counts as &quot;rough&quot;
            varies just as much.
          </p>
          <p>
            Separately, several beaches are flagged as surf spots. That flag simply tells you people come there
            specifically to surf.
          </p>
        </AboutCard>

        <AboutCard id="sargassum" heading="Sargassum">
          <SargassumScale />
          <p>
            Sargassum is the brown seaweed that drifts across the Atlantic onto Caribbean shores, mostly between spring
            and late summer. It isn&apos;t dangerous, but in volume it piles up on the sand and in the shallows and
            affects how pleasant a beach is.
          </p>
          <p>
            We track it at coast level as clear, some present, or heavy. These estimates are updated weekly, by hand,
            from local bulletins and direct observation. It can shift rapidly within days and varies along a single
            coast, so treat the level as a general signal. Where a beach has a webcam, that tells you more than a
            coast-wide estimate could.
          </p>
        </AboutCard>

        <AboutCard id="data" heading="Where our data comes from">
          <DataSources />
          <p>
            BajanBeach runs on a few public data sources, and we&apos;re honest about their limits. Wave height,
            period, wind and tide come from marine and weather models built on offshore data. They give a good general
            read but don&apos;t know individual beach factors like the presence of a reef or breakwater that softens
            the swell.
          </p>
          <p>
            Our algorithm adjusts for these with local insight, but the numbers are still indicative. They are not a
            substitute for a webcam, local advice, or standing on the sand.
          </p>
        </AboutCard>

        <AboutCard id="safety" heading="Safety">
          <p>
            BajanBeach is a discovery and planning tool, not a safety authority. Conditions can change quickly so
            before heading out, especially to the rougher Atlantic coasts, check official sources like the Barbados
            Meteorological Services and respect marine warnings, posted signs and lifeguard guidance. If a beach looks
            unsafe when you arrive, trust what you see over any score from our site.
          </p>
          <ManchineelCallout />
        </AboutCard>
      </div>
    </main>
  );
}
