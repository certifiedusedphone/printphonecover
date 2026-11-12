import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { adminDenied } from "@/lib/server/require-admin";
import { BUSINESS, SOCIALS } from "@/lib/site";

export async function POST(req: Request) {
  const denied = await adminDenied(); if (denied) return denied;
  const body = (await req.json()) as Record<string, string>;
  const rows: { key: string; value: string }[] = [];
  for (const x of SOCIALS) {
    const v = (body[x.key] ?? "").trim();
    if (v && !/^https:\/\/\S+$/.test(v)) return NextResponse.json({ error: `${x.label}: use the full link starting with https://` }, { status: 400 });
    rows.push({ key: x.key, value: v });
  }
  for (const x of BUSINESS) {
    const v = (body[x.key] ?? "").trim().slice(0, 200);
    if (x.key === "contact_email" && v && !/^\S+@\S+\.\S+$/.test(v)) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    rows.push({ key: x.key, value: v });
  }
  const r = await db().from("site_settings").upsert(rows);
  if (r.error) return NextResponse.json({ error: r.error.message.includes("site_settings") ? "Run supabase/settings.sql in Supabase first." : r.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
