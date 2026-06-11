import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const origin = new URL(request.url).origin;

  revalidateTag("beach-cards");
  revalidatePath("/");
  revalidatePath("/map");

  const warm = async (pathname: string) => {
    const url = `${origin}${pathname}`;
    const res = await fetch(url, { cache: "no-store" });
    return { pathname, url, status: res.status, ok: res.ok };
  };

  const home = await warm("/");
  const map = await warm("/map");

  if (!home.ok || !map.ok) {
    return Response.json(
      { ok: false, origin, home, map, at: new Date().toISOString() },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    origin,
    home,
    map,
    at: new Date().toISOString()
  });
}
