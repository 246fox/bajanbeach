import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ocean-100/60 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-medium"
          aria-label="Site"
        >
          <Link href="/about" className="text-ocean-700 transition hover:text-ocean-600">
            About
          </Link>
        </nav>
        <p className="mt-3 text-xs text-slate-500">© 2026 BajanBeach</p>
      </div>
    </footer>
  );
}
