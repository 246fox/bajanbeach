import Link from "next/link";
// import { FooterEmailSignup } from "@/components/FooterEmailSignup";
import { FooterSignupCompact } from "@/components/FooterSignupCompact";
import { FooterSignupLink } from "@/components/FooterSignupLink";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ocean-100/60 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
        {/* TEMPORARY REVIEW — remove after Jonathan picks a variant */}
        <div className="mb-8 space-y-8">
          <div>
            <p className="mb-2 text-center text-xs text-slate-500">Variant A — collapse to link</p>
            <FooterSignupLink />
          </div>
          <div>
            <p className="mb-2 text-center text-xs text-slate-500">Variant B — compact inline</p>
            <FooterSignupCompact />
          </div>
        </div>
        {/* <FooterEmailSignup /> */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-medium"
          aria-label="Site"
        >
          <Link href="/map" className="text-ocean-700 transition hover:text-ocean-600">
            Map
          </Link>
          <Link href="/about" className="text-ocean-700 transition hover:text-ocean-600">
            About
          </Link>
          <Link href="/contact" className="text-ocean-700 transition hover:text-ocean-600">
            Contact
          </Link>
        </nav>
        <p className="mt-3 text-xs text-slate-500">© 2026 BajanBeach</p>
      </div>
    </footer>
  );
}
