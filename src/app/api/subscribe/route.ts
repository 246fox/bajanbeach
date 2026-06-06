import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";

const MAX_EMAIL_LEN = 254;

/** Hand-rolled basic shape — not exhaustive RFC validation. */
function isPlausibleEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LEN) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;

  if (typeof rec.website === "string" && rec.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const rawEmail = rec.email;
  if (typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  if (email === "") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Signups are temporarily unavailable." }, { status: 503 });
  }

  const { error } = await supabase.from("subscribers").insert({ email, source: "footer" });

  if (!error) {
    return NextResponse.json({ ok: true });
  }

  if (error.code === "23505") {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  console.error("[api/subscribe] insert failed", { message: error.message, code: error.code });
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
