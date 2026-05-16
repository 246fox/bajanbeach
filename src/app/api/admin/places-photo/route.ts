import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-session";
import { googleMapsKey } from "@/lib/beach-photos";
import { isValidGooglePlacePhotoReference } from "@/lib/place-photo-ref";

const PROXY_CACHE_SECONDS = 300;

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ref = request.nextUrl.searchParams.get("ref")?.trim() ?? "";
  if (!isValidGooglePlacePhotoReference(ref)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const maxPxRaw = request.nextUrl.searchParams.get("maxPx") ?? "400";
  const maxPx = Math.min(1600, Math.max(64, Number.parseInt(maxPxRaw, 10) || 400));

  const apiKey = googleMapsKey();
  if (!apiKey) {
    return new NextResponse("Places API key not configured", { status: 503 });
  }

  const upstreamUrl = new URL(`https://places.googleapis.com/v1/${ref}/media`);
  upstreamUrl.searchParams.set("maxHeightPx", String(maxPx));
  upstreamUrl.searchParams.set("key", apiKey);

  const upstream = await fetch(upstreamUrl.toString(), {
    next: { revalidate: PROXY_CACHE_SECONDS }
  });

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `private, max-age=${PROXY_CACHE_SECONDS}`
    }
  });
}
