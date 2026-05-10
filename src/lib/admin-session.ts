import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "bb_admin_session";

function getSecret(): Uint8Array | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return null;
  }
  return new TextEncoder().encode(password);
}

export async function createAdminSession(): Promise<void> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  const token = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function destroyAdminSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function verifyAdminSession(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) {
    return false;
  }
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function requireAdminSession(): Promise<void> {
  if (!(await verifyAdminSession())) {
    redirect("/admin/login");
  }
}
