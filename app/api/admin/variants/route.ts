import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { adminDenied } from "@/lib/server/require-admin";

type Body =
  | { action: "update_variant"; id: string; price_cents: number; stock: number; active: boolean; mask_src?: string }
  | { action: "update_device"; id: string; name: string; series: string; active: boolean }
  | { action: "add_device"; id: string; brand_id: string; name: string; series: string; masks: Record<string, string> }
  | { action: "toggle_brand"; id: string; active: boolean };

const okUrl = (u?: string) => !u || /^https:\/\/\S+\.png(\?\S*)?$/i.test(u);

export async function POST(req: Request) {
  const denied = await adminDenied(); if (denied) return denied;
  const b = (await req.json()) as Body;
  const s = db();
  try {
    if (b.action === "update_variant") {
      if (!Number.isInteger(b.price_cents) || b.price_cents < 0 || !Number.isInteger(b.stock)) throw new Error("Price and stock must be whole numbers.");
      if (!okUrl(b.mask_src)) throw new Error("The mask must be an https link to a .png file.");
      const patch: Record<string, unknown> = { price_cents: b.price_cents, stock: b.stock, active: b.active };
      if (b.mask_src !== undefined) {
        const { data: cur } = await s.from("variants").select("mask_src").eq("id", b.id).single();
        if (cur && cur.mask_src !== b.mask_src) Object.assign(patch, { mask_src: b.mask_src || null, mask_url: null, mask_w: null, mask_h: null });
      }
      const r = await s.from("variants").update(patch).eq("id", b.id);
      if (r.error) throw r.error;
    } else if (b.action === "update_device") {
      const r = await s.from("devices").update({ name: b.name, series: b.series || null, active: b.active }).eq("id", b.id);
      if (r.error) throw r.error;
    } else if (b.action === "add_device") {
      if (!/^[a-z0-9-]{2,40}$/.test(b.id)) throw new Error("ID must be lowercase letters, numbers or dashes, like galaxy-s27.");
      if (Object.values(b.masks).some((u) => !okUrl(u))) throw new Error("Each mask must be an https link to a .png file.");
      const r = await s.from("devices").insert({ id: b.id, brand_id: b.brand_id, name: b.name, series: b.series || null, sort: 1000 });
      if (r.error) throw r.error;
      const { data: products } = await s.from("products").select("id");
      const rows = (products ?? []).filter((p) => b.masks[p.id]).map((p) => ({
        device_id: b.id, product_id: p.id, price_cents: p.id === "m3" ? 2000 : 3000, stock: 0, active: false, mask_src: b.masks[p.id],
      }));
      if (rows.length) { const v = await s.from("variants").insert(rows); if (v.error) throw v.error; }
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
