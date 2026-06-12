import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function warmupBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const baseUrl = warmupBaseUrl(request);

  try {
    revalidateTag("beach-cards");
    revalidatePath("/");
    revalidatePath("/map");
  } catch (err) {
    console.error("[cron/refresh-conditions] invalidation failed", err);
    return Response.json(
      {
        ok: false,
        phase: "invalidate",
        message: err instanceof Error ? err.message : "Unknown error",
        at: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  const warm = async (pathname: string) => {
    const url = `${baseUrl}${pathname}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = { pathname, url, status: res.status, ok: res.ok };
      if (!res.ok) {
        console.warn("[cron/refresh-conditions] warm non-OK", body);
      }
      return body;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[cron/refresh-conditions] warm fetch failed", { url, message });
      return { pathname, url, ok: false, status: 0, error: message };
    }
  };

  const home = await warm("/");
  const map = await warm("/map");

  const warmsOk = home.ok && map.ok;

  return Response.json({
    ok: true,
    warmsOk,
    warmupBaseUrl: baseUrl,
    home,
    map,
    at: new Date().toISOString()
  });
}
