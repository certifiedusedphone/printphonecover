import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin-auth";

// Second check on every admin page and API route, in addition to middleware.
export async function isAdmin() {
  return isAdminCookie(cookies().get(ADMIN_COOKIE)?.value);
}
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}
export async function adminDenied() {
  return (await isAdmin()) ? null : NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
