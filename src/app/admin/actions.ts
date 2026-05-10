"use server";

import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession } from "@/lib/admin-session";

export type LoginState = { error?: string };

export async function loginAdmin(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "Admin login is not configured." };
  }
  if (typeof password !== "string" || password !== expected) {
    return { error: "Incorrect password." };
  }
  await createAdminSession();
  redirect("/admin/sargassum");
}

export async function logoutAdmin(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
