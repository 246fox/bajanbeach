import { NextRequest, NextResponse } from "next/server";
import { getBeachBySlug } from "@/data/beaches";
import { verifyAdminSession } from "@/lib/admin-session";
import { getGooglePlacePhotoReferences } from "@/lib/beach-photos";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  const beach = getBeachBySlug(slug);
  if (!beach) {
    return NextResponse.json({ error: "Unknown beach slug." }, { status: 400 });
  }

  const googlePhotoRefs = await getGooglePlacePhotoReferences(beach);
  return NextResponse.json({ googlePhotoRefs });
}
