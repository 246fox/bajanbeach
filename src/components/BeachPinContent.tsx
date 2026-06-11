"use client";

import Image from "next/image";
import Link from "next/link";
import type { BeachCardData } from "@/types/beach";
import { activityLabel, formatScoreLabel, scoreStyles } from "@/lib/beach-format";
import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";
import { isSupabaseStorageUrl } from "@/lib/is-supabase-storage-url";

type Props = {
  beach: BeachCardData;
  layout?: "compact" | "sheet";
};

export function BeachPinContent({ beach, layout = "compact" }: Props) {
  const isSheet = layout === "sheet";
  const photoSrc = beach.photoUrl ?? BEACH_PHOTO_PLACEHOLDER;
  const unoptimized = !isSupabaseStorageUrl(photoSrc);

  const badge = (
    <p
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreStyles(
        beach.conditions.swimScore
      )}`}
    >
      {activityLabel(beach)} {formatScoreLabel(beach.conditions.swimScore)}
    </p>
  );

  const title = (
    <h2 className={`font-semibold text-slate-800 ${isSheet ? "text-lg" : "text-base leading-tight"}`}>
      {beach.name}
    </h2>
  );

  const link = (
    <Link
      href={`/beaches/${beach.slug}`}
      className="text-sm font-semibold text-ocean-700 underline-offset-2 hover:underline"
    >
      View details
    </Link>
  );

  const image = isSheet ? (
    <div className="relative mx-auto h-32 w-full max-w-xs overflow-hidden rounded-xl sm:h-36">
      <Image
        src={photoSrc}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 320px"
        unoptimized={unoptimized}
      />
    </div>
  ) : (
    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl">
      <Image
        src={photoSrc}
        alt=""
        fill
        className="object-cover"
        sizes="112px"
        unoptimized={unoptimized}
      />
    </div>
  );

  if (isSheet) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">{image}</div>
        <div className="flex flex-col items-center gap-2 text-center">
          {title}
          {badge}
          {link}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm gap-3">
      {image}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
        {title}
        {badge}
        {link}
      </div>
    </div>
  );
}
