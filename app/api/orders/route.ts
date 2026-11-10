import { NextResponse } from "next/server";
import { db, BUCKET } from "@/lib/server/db";
import { newOrderNumber, newToken } from "@/lib/server/orders";
import { SHIPPING, type Address, type ShippingKey } from "@/lib/shipping";

type Body = {
  variantId: string;
  design: unknown;
  email: string;
  phone?: string;
  address: Address;
  addressVerified: boolean;
  shipping: ShippingKey;
};

// Step 1 of checkout: create a pending order and hand back signed upload URLs
// so the browser can upload the print file and preview straight to storage.
export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  const ship = SHIPPING[b.shipping];
  const a = b.address;
  if (!ship) return NextResponse.json({ error: "Choose a shipping option." }, { status: 400 });
  if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!a?.name || !a.line1 || !a.city || !/^[A-Z]{2}$/.test(a.state) || !/^\d{5}(-\d{4})?$/.test(a.zip))
    return NextResponse.json({ error: "Please check the shipping address." }, { status: 400 });

  const s = db();
  const { data: v, error } = await s
    .from("variants")
    .select("id,price_cents,stock,active,devices(name),products(name,code)")
    .eq("id", b.variantId).single();
  if (error || !v || !v.active) return NextResponse.json({ error: "That case is no longer available." }, { status: 400 });
  if (v.stock <= 0) return NextResponse.json({ error: "That case is out of stock right now." }, { status: 409 });

  const device = v.devices as unknown as { name: string };
  const product = v.products as unknown as { name: string; code: string };
  const id = crypto.randomUUID();
  const order = {
    id, number: newOrderNumber(), token: newToken(), status: "pending",
    email: b.email.trim().toLowerCase(), phone: b.phone?.trim() || null,
    ship_name: a.name.trim(), ship_line1: a.line1.trim(), ship_line2: a.line2?.trim() || null,
    ship_city: a.city.trim(), ship_state: a.state, ship_zip: a.zip,
    address_verified: !!b.addressVerified, shipping_method: b.shipping,
    variant_id: v.id, device_name: device.name, product_name: `${product.code} ${product.name}`,
    subtotal_cents: v.price_cents, shipping_cents: ship.cents, total_cents: v.price_cents + ship.cents,
    design: b.design ?? null,
    print_path: `${id}/print.png`, preview_path: `${id}/preview.jpg`,
  };
  const ins = await s.from("orders").insert(order);
  if (ins.error) { console.error(ins.error); return NextResponse.json({ error: "Could not create the order. Please try again." }, { status: 500 }); }

  const [p1, p2] = await Promise.all([
    s.storage.from(BUCKET).createSignedUploadUrl(order.print_path),
    s.storage.from(BUCKET).createSignedUploadUrl(order.preview_path),
  ]);
  if (p1.error || p2.error) return NextResponse.json({ error: "Could not prepare the upload. Please try again." }, { status: 500 });

  return NextResponse.json({
    orderId: id, token: order.token,
    uploads: { print: { path: order.print_path, token: p1.data.token }, preview: { path: order.preview_path, token: p2.data.token } },
  });
}
