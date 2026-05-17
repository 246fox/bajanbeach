import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About BajanBeach — How our beach scores work",
  description:
    "How BajanBeach scores swimming and scenic beaches, what calm/moderate/rough mean, how sargassum is tracked, and where wave and weather data come from."
};

const ABOUT_CARD_CLASS =
  "scroll-mt-6 overflow-hidden rounded-3xl border border-ocean-100/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8";

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

      <nav
        className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500"
        aria-label="On this page"
      >
        {JUMP_LINKS.map((link, index) => (
          <span key={link.href} className="inline-flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <Link href={link.href} className="font-medium text-ocean-700 hover:text-ocean-600">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        <AboutCard id="scores" heading="The score: Swim or Scenic">
          <p>
            Every beach carries a single score out of 10 for the current day. What that score measures depends on
            the kind of beach.
          </p>
          <p>
            A Swim score appears on calm and moderate beaches like west and south coast swimming beaches. It answers
            one question: how good is the water for swimming right now? A high score means gentle conditions and a
            pleasant time in the sea; a low score means choppier water or wind that makes for a less enjoyable swim.
          </p>
          <p>
            A Scenic score appears on rough beaches like the wild Atlantic stretches of the east and south-east.
            Conditions on these beaches are generally not safe for swimming, you visit them for the drama of the
            coastline and picturesque scenery. The Scenic score answers a different question: is today a good day to
            make the trip out there? It leans on weather, wind, sargassum levels and visibility rather than wave
            size, because a rough water beach is meant to have big waves.
          </p>
          <p>
            Our score is only a guide, not a promise. It&apos;s built from modelled data and a fixed read on each
            beach&apos;s character, so conditions on the day can still surprise you. Always trust a webcam and your
            own eyes over a number.
          </p>
        </AboutCard>

        <AboutCard id="sea-state" heading="Sea state: calm, moderate, rough">
          <p>
            Each beach has a sea state describing how its water generally behaves: calm, moderate, or rough.
          </p>
          <p>
            It&apos;s worth being honest about the sea state. Calm, Moderate or Rough in Barbados is subjective. Even
            the most sheltered west coast beach sits on the open Caribbean and will have gentle swell, the odd wave,
            and a current somewhere – it will never be as still as a lake or swimming pool. That&apos;s true for the
            other end of the spectrum as well where what is considered as a &apos;rough sea&apos; will vary greatly.
            Sea state describes how a beach behaves relative to other Barbados beaches — not a promise that sea
            conditions will match your expectation.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Calm</strong> — Sheltered, swimming-first beaches. The west coast and protected south coast.
            </li>
            <li>
              <strong>Moderate</strong> — Genuine wave action, comfortable for confident swimmers, good for
              bodyboarding and general beach days.
            </li>
            <li>
              <strong>Rough</strong> — Strong Atlantic waves, currents and shore break. Spectacular to look at, not
              generally safe to swim. These carry a Scenic score, not a Swim score.
            </li>
          </ul>
          <p>
            Separately, seven beaches are flagged as surf spots. The flag simply tells you people come here
            specifically to surf.
          </p>
        </AboutCard>

        <AboutCard id="sargassum" heading="Sargassum">
          <p>
            Sargassum is the brown seaweed that drifts across the Atlantic and washes up on Caribbean shores, mostly
            between spring and late summer. When it arrives in volume it can pile up on the sand and in the shallows.
            It isn&apos;t dangerous, but it affects whether a beach is pleasant on a given week.
          </p>
          <p>BajanBeach tracks sargassum at the coast level and shows it as one of three states:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Clear</strong> — little or no sargassum reported.
            </li>
            <li>
              <strong>Some present</strong> — patchy seaweed; worth checking before you go.
            </li>
            <li>
              <strong>Heavy</strong> — significant accumulation; the beach experience is affected.
            </li>
          </ul>
          <p>
            These are estimates, updated weekly by hand from regional bulletins. Sargassum can shift within days and
            varies a lot along a single coast, so treat the level as a general signal. Where a beach has a webcam,
            that will tell you more than a coast-wide estimate.
          </p>
        </AboutCard>

        <AboutCard id="data" heading="Where our data comes from">
          <p>
            BajanBeach is built on a small number of public data sources, and we&apos;re honest about their limits.
          </p>
          <p>
            Wave height, wave period, wind speed, wind direction and tide times come from marine and weather models
            based on offshore data. They give a good general read on the day, but they don&apos;t know about
            individual beach factors, for example a reef or breakwater that attenuates ocean swells. Our algorithm
            makes adjustments for this based on local insights but still, the numbers reported for a beach are just
            indicative. They are not a substitute for a webcam, local advice, or standing on the sand.
          </p>
        </AboutCard>

        <AboutCard id="safety" heading="Safety">
          <p>
            BajanBeach is a discovery and planning tool, not a navigational or safety authority. The scores and
            conditions here are there to help you choose a beach — they are not a substitute for your own judgement
            on the day.
          </p>
          <p>
            Sea conditions can change quickly. Before heading out, especially to the rougher Atlantic coasts, check
            official sources such as the Barbados Meteorological Services, and always respect marine warnings,
            posted signs, and lifeguard guidance. If a beach looks unsafe when you arrive, trust what you see over any
            score on this site.
          </p>
        </AboutCard>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate-500">
        BajanBeach is a young, growing project and the scoring is still being calibrated. If a score ever looks
        plainly wrong for a beach you know well, that&apos;s useful to hear — a contact page is coming soon.
      </p>
    </main>
  );
}
