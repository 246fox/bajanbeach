import { NextResponse } from "next/server";
import { findBeachByPhotoApiParam } from "@/data/beaches";
import { fetchPhotoOverrideForSlug } from "@/lib/beach-photo-overrides";
import { getBeachPhotoUrlsUnlessOverridden } from "@/lib/beach-photos";

export async function GET(request: Request) {
  const hasKey = Boolean(process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
  if (!hasKey) {
    return NextResponse.json({ error: "Google Maps API key missing." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const beachParam = searchParams.get("beach");
  if (!beachParam?.trim()) {
    return NextResponse.json({ error: "Missing beach query parameter." }, { status: 400 });
  }

  const beach = findBeachByPhotoApiParam(beachParam);
  if (!beach) {
    return NextResponse.json({ error: "Unknown beach." }, { status: 404 });
  }

  const override = await fetchPhotoOverrideForSlug(beach.slug);
  const photoUrls = await getBeachPhotoUrlsUnlessOverridden(beach, override);
  return NextResponse.json({ photoUrls });
}
