import type { Metadata } from "next";
import { UsefulToHear, MailIcon } from "@/components/contact/UsefulToHear";
import { ABOUT_CARD_CLASS } from "@/lib/ui-classes";

export const metadata: Metadata = {
  title: "Contact BajanBeach",
  description:
    "Get in touch with BajanBeach — corrections, local knowledge, and partnership enquiries welcome.",
  alternates: {
    canonical: "/contact"
  }
};

const CONTACT_EMAIL_CTA_CLASS =
  "mt-6 flex w-full sm:w-fit sm:mx-auto items-center justify-center rounded-xl bg-ocean-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2 gap-2";

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
            <UsefulToHear />
            <a href="mailto:contact@bajanbeach.com" className={CONTACT_EMAIL_CTA_CLASS}>
              <MailIcon className="h-[18px] w-[18px]" />
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
