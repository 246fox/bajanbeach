import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeachConditionPanel } from "@/components/BeachConditionPanel";
import { WaveForecastChart } from "@/components/WaveForecastChart";
import { beaches, getBeachBySlug } from "@/data/beaches";
import { fetchBeachConditions } from "@/lib/beach-conditions";
import { getBeachPhotoUrls } from "@/lib/beach-photos";
import { fetchSevenDayWaveForecast } from "@/lib/wave-forecast";

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return beaches.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const beach = getBeachBySlug(params.slug);
  if (!beach) {
    return { title: "Beach | BajanBeach" };
  }
  return {
    title: `${beach.name} | BajanBeach`,
    description: beach.description
  };
}

function BackLink() {
  return (
    <Link
      href="/"
      className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-ocean-700 transition hover:text-ocean-600"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4 transition group-hover:-translate-x-0.5"
      >
        <path
          d="M15 18l-6-6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Back to all beaches
    </Link>
  );
}

export default async function BeachDetailPage({ params }: PageProps) {
  const beach = getBeachBySlug(params.slug);
  if (!beach) {
    notFound();
  }

  const [conditions, photoUrls, waveForecast] = await Promise.all([
    fetchBeachConditions(beach),
    getBeachPhotoUrls(beach.name),
    fetchSevenDayWaveForecast(beach.latitude, beach.longitude)
  ]);

  const heroUrl = photoUrls[0] ?? null;
  const hasWebcam = beach.webcamUrl.trim() !== "";
  const isWarningNote = beach.notes.includes("⚠️");
  const mapsEmbedUrl = `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    q: `${beach.latitude},${beach.longitude}`,
    center: `${beach.latitude},${beach.longitude}`,
    zoom: "15"
  }).toString()}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${beach.latitude},${beach.longitude}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink />

      <header className="overflow-hidden rounded-3xl border border-ocean-100/70 bg-white/80 shadow-sm backdrop-blur-sm">
        <div
          className={`relative min-h-[280px] w-full sm:min-h-[360px] ${heroUrl ? "" : "bg-gradient-to-br from-sky-200 via-cyan-100 to-ocean-100"}`}
          style={
            heroUrl
              ? {
                  backgroundImage: `url("${heroUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/25 to-transparent" />
          <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[360px] sm:p-10">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{beach.name}</h1>
            <p className="mt-3 text-base text-white/90">
              <span>{beach.parish}</span>
              <span className="mx-2 text-white/50">·</span>
              <span>{beach.coast} coast</span>
              <span className="mx-2 text-white/50">·</span>
              <span className="capitalize">{beach.type}</span>
            </p>
          </div>
        </div>
      </header>

      <article className="mt-10 space-y-10">
        <section>
          <h2 className="sr-only">About</h2>
          <p className="text-base leading-relaxed text-slate-700">{beach.description}</p>
        </section>

        <section>
          <BeachConditionPanel beach={beach} conditions={conditions} />
        </section>

        <section className="rounded-2xl border border-ocean-100/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-800">Location</h2>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-ocean-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2"
          >
            Get Directions
          </a>
          <div className="mt-4 overflow-hidden rounded-2xl border border-ocean-100/80 bg-slate-100">
            <iframe
              title={`Map of ${beach.name}`}
              src={mapsEmbedUrl}
              className="h-[320px] w-full sm:h-[380px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>

        {hasWebcam && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800">Live Cam</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-ocean-100/80 bg-slate-900/5 shadow-inner">
              <iframe
                src={beach.webcamUrl}
                title={`Live Cam — ${beach.name}`}
                className="aspect-video w-full min-h-[240px]"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              If the stream does not load, the provider may block embedding — open the{" "}
              <a
                href={beach.webcamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ocean-700 underline hover:text-ocean-600"
              >
                webcam page directly
              </a>
              .
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-ocean-100/80 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-800">7-day wave forecast</h2>
          <p className="mt-1 text-sm text-slate-600">
            Maximum hourly wave height per day (Open-Meteo marine, America/Barbados).
          </p>
          <div className="mt-6">
            <WaveForecastChart data={waveForecast} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800">Best for</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-700">{beach.bestFor}</p>
        </section>

        {isWarningNote ? (
          <section
            role="note"
            aria-label="Safety warning"
            className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600"
            >
              <path
                d="M12 3 2.5 20h19L12 3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 10v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17.5" r="1" fill="currentColor" />
            </svg>
            <div>
              <h2 className="text-base font-semibold text-amber-900">Safety notice</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                {beach.notes.replace(/^⚠️\s*/, "")}
              </p>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-lg font-semibold text-slate-800">Notes</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">{beach.notes}</p>
          </section>
        )}

        <div className="border-t border-ocean-100/70 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-ocean-700 hover:text-ocean-600"
          >
            ← Back to all beaches
          </Link>
        </div>
      </article>
    </main>
  );
}
