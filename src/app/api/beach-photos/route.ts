import { NextResponse } from "next/server";
import { getBeachPhotoUrls } from "@/lib/beach-photos";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_MAPS_KEY) {
    return NextResponse.json({ error: "Server key missing." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const beachParam = searchParams.get("beach");
  if (!beachParam?.trim()) {
    return NextResponse.json({ error: "Missing beach query parameter." }, { status: 400 });
  }

  const photoUrls = await getBeachPhotoUrls(beachParam);
  return NextResponse.json({ photoUrls });
}
