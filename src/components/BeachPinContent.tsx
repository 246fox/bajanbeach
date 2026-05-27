"use client";

import Image from "next/image";
import Link from "next/link";
import type { BeachCardData } from "@/types/beach";
import { activityLabel, formatScoreLabel, scoreStyles } from "@/lib/beach-format";
import { BEACH_PHOTO_PLACEHOLDER } from "@/lib/beach-photo-placeholder";

type Props = {
  beach: BeachCardData;
  layout?: "compact" | "sheet";
};

export function BeachPinContent({ beach, layout = "compact" }: Props) {
  const isSheet = layout === "sheet";
  const photoSrc = beach.photoUrl ?? BEACH_PHOTO_PLACEHOLDER;
  const useUnoptimized =
    photoSrc.startsWith("http://") ||
    photoSrc.startsWith("https://") ||
    photoSrc.startsWith("/api");

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

  const image = (
    <Image
      src={photoSrc}
      alt=""
      width={isSheet ? 320 : 112}
      height={isSheet ? 200 : 96}
      className={
        isSheet
          ? "h-32 w-full max-w-xs rounded-xl object-cover sm:h-36"
          : "h-24 w-28 shrink-0 rounded-xl object-cover"
      }
      unoptimized={useUnoptimized}
    />
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
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title}
        {badge}
        {link}
      </div>
    </div>
  );
}
