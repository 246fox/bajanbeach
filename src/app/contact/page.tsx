import type { Metadata } from "next";
import { ABOUT_CARD_CLASS } from "@/app/about/page";

export const metadata: Metadata = {
  title: "Contact BajanBeach",
  description:
    "Get in touch with BajanBeach — corrections, local knowledge, and partnership enquiries welcome.",
  alternates: {
    canonical: "/contact"
  }
};

const CONTACT_EMAIL_CTA_CLASS =
  "mt-6 inline-flex w-full items-center justify-center rounded-xl bg-ocean-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">Contact BajanBeach</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          BajanBeach is run from Barbados by a Bajan, drawing on local knowledge of every coast. The best way to keep
          the site accurate is to hear from other people who know these beaches well — corrections, additions, and
          ground-truth are exactly the kind of input that makes it better.
        </p>
      </header>

      <div className="mt-10">
        <section className={ABOUT_CARD_CLASS}>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
            What&apos;s useful to hear
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>Some of the most helpful kinds of message:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>A score that looks plainly wrong.</strong> The scoring is still being calibrated, and
                ground-truth from people who know a beach well beats anything an algorithm can guess. If a Swim or
                Scenic score doesn&apos;t match what&apos;s actually happening on the sand, that&apos;s exactly the
                kind of feedback we need.
              </li>
              <li>
                <strong>Beaches we&apos;ve missed, or details that are wrong.</strong> A cove that isn&apos;t on the
                site, an outdated description, a coast tag that doesn&apos;t match how locals actually classify it,
                sargassum levels that have changed since the last weekly update.
              </li>
              <li>
                <strong>Hotels, villas, and operators.</strong> If you run a property and want to talk about
                featuring local conditions on your own site or app, get in touch — early conversations welcome.
              </li>
            </ul>
            <a href="mailto:contact@bajanbeach.com" className={CONTACT_EMAIL_CTA_CLASS}>
              Email contact@bajanbeach.com
            </a>
          </div>
        </section>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate-500">
        Replies usually come within a day or two.
      </p>
    </main>
  );
}
