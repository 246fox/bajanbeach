import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-ocean-100/60 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="inline-flex cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400 focus-visible:ring-offset-2"
          aria-label="BajanBeach home"
        >
          <Image
            src="/logo.jpeg"
            alt="BajanBeach logo"
            width={400}
            height={128}
            className="h-auto w-[240px] sm:w-[320px]"
            priority
            unoptimized
          />
        </Link>
      </div>
    </header>
  );
}
