import { NextResponse } from "next/server";
import { db, BUCKET } from "@/lib/server/db";
import { adminDenied } from "@/lib/server/require-admin";
import { newOrderNumber, newToken } from "@/lib/server/orders";
import type { Address } from "@/lib/shipping";

type Body = {
  channel: "amazon" | "tiktok";
  channelOrderId: string;
  variantId: string;
  address: Address;
  email?: string;
  phone?: string;
  shipping: "standard" | "priority";
  paidCents?: number;
  design: unknown;
};

// Creates a marketplace order (pending until its print file is uploaded and confirmed).
export async function POST(req: Request) {
  const denied = await adminDenied(); if (denied) return denied;
  try {
    const b = (await req.json()) as Body;
    const a = b.address;
    if (b.channel !== "amazon" && b.channel !== "tiktok") throw new Error("Choose Amazon or TikTok.");
    const cid = (b.channelOrderId || "").trim();
    if (cid.length < 4) throw new Error("Enter the marketplace order number.");
    if (!a?.name || !a.line1 || !a.city || !/^[A-Z]{2}$/.test(a.state) || !/^\d{5}(-\d{4})?$/.test(a.zip)) throw new Error("Check the shipping address (2-letter state, 5-digit ZIP).");
    const s = db();
    const dup = await s.from("orders").select("number").eq("channel", b.channel).eq("channel_order_id", cid).maybeSingle();
    if (dup.data) throw new Error(`This order was already entered as ${dup.data.number}.`);
    const { data: v } = await s.from("variants").select("id,price_cents,devices(name),products(name,code)").eq("id", b.variantId).single();
    if (!v) throw new Error("Choose the phone model and case.");
    const device = v.devices as unknown as { name: string };
    const product = v.products as unknown as { name: string; code: string };
    const paid = Number.isInteger(b.paidCents) && (b.paidCents as number) >= 0 ? (b.paidCents as number) : v.price_cents;
    const id = crypto.randomUUID();
    const order = {
      id, number: newOrderNumber(), token: newToken(), status: "pending",
      channel: b.channel, channel_order_id: cid,
      email: b.email?.trim().toLowerCase() || null, phone: b.phone?.trim() || null,
      ship_name: a.name.trim(), ship_line1: a.line1.trim(), ship_line2: a.line2?.trim() || null,
      ship_city: a.city.trim(), ship_state: a.state, ship_zip: a.zip, address_verified: false,
      shipping_method: b.shipping === "priority" ? "priority" : "standard", fulfillment: "ship",
      variant_id: v.id, device_name: device.name, product_name: `${product.code} ${product.name}`,
      subtotal_cents: paid, shipping_cents: 0, total_cents: paid, design: b.design ?? null,
      print_path: `${id}/print.png`, preview_path: `${id}/preview.jpg`,
    };
    const ins = await s.from("orders").insert(order);
    if (ins.error) throw ins.error;
    const [p1, p2] = await Promise.all([
      s.storage.from(BUCKET).createSignedUploadUrl(order.print_path),
      s.storage.from(BUCKET).createSignedUploadUrl(order.preview_path),
    ]);
    if (p1.error || p2.error) throw new Error("Could not prepare the upload.");
    return NextResponse.json({
      orderId: id,
      uploads: { print: { path: order.print_path, token: p1.data.token }, preview: { path: order.preview_path, token: p2.data.token } },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string }).message || "Could not save the order." }, { status: 400 });
  }
}
