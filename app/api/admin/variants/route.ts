import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import type { Geometry } from "@/lib/design/render";
import { adminDenied } from "@/lib/server/require-admin";

type Body =
  | { action: "update_variant"; id: string; price_cents: number; stock: number; active: boolean }
  | { action: "update_device"; id: string; name: string; geometry: Geometry; active: boolean }
  | { action: "add_device"; id: string; brand_id: string; name: string; geometry: Geometry }
  | { action: "toggle_brand"; id: string; active: boolean };

function validGeometry(g: Geometry) {
  const n = (v: unknown) => typeof v === "number" && isFinite(v) && v >= 0;
  return g && n(g.w) && n(g.h) && n(g.r) && g.cam && n(g.cam.x) && n(g.cam.y) && n(g.cam.w) && n(g.cam.h) && n(g.cam.r) && Array.isArray(g.cam.lenses);
}

export async function POST(req: Request) {
  const denied = await adminDenied(); if (denied) return denied;
  const b = (await req.json()) as Body;
  const s = db();
  try {
    if (b.action === "update_variant") {
      if (!Number.isInteger(b.price_cents) || b.price_cents < 0 || !Number.isInteger(b.stock)) throw new Error("Price and stock must be whole numbers.");
      const r = await s.from("variants").update({ price_cents: b.price_cents, stock: b.stock, active: b.active }).eq("id", b.id);
      if (r.error) throw r.error;
    } else if (b.action === "update_device") {
      if (!validGeometry(b.geometry)) throw new Error("The outline is missing a number. Check w, h, r and the cam values.");
      const r = await s.from("devices").update({ name: b.name, geometry: b.geometry, active: b.active }).eq("id", b.id);
      if (r.error) throw r.error;
    } else if (b.action === "add_device") {
      if (!/^[a-z0-9-]{2,40}$/.test(b.id)) throw new Error("ID must be lowercase letters, numbers or dashes, like s25ultra.");
      if (!validGeometry(b.geometry)) throw new Error("The outline is missing a number. Check w, h, r and the cam values.");
      const r = await s.from("devices").insert({ id: b.id, brand_id: b.brand_id, name: b.name, geometry: b.geometry, sort: 100 });
      if (r.error) throw r.error;
      const { data: products } = await s.from("products").select("id");
      if (products?.length) await s.from("variants").insert(products.map((p) => ({ device_id: b.id, product_id: p.id, price_cents: 3000, stock: 0, active: false })));
    } else if (b.action === "toggle_brand") {
      const r = await s.from("brands").update({ active: b.active }).eq("id", b.id);
      if (r.error) throw r.error;
    } else throw new Error("Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as { message?: string }).message || "Save failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
