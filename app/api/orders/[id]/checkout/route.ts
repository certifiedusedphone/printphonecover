import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db, BUCKET } from "@/lib/server/db";
import { stripe } from "@/lib/server/stripe";
import { SHIPPING, type ShippingKey } from "@/lib/shipping";

// Step 2 of checkout: files are uploaded, so open a Stripe Checkout session.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { token } = (await req.json()) as { token: string };
  const s = db();
  const { data: o } = await s.from("orders").select("*").eq("id", params.id).single();
  if (!o || o.token !== token) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (o.status !== "pending") return NextResponse.json({ error: "This order is already paid." }, { status: 409 });

  const { data: files } = await s.storage.from(BUCKET).list(o.id);
  if (!files?.some((f) => f.name === "print.png")) return NextResponse.json({ error: "The design upload did not finish. Please try again." }, { status: 400 });

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Checkout blocked: STRIPE_SECRET_KEY is not set in Cloudflare.");
    return NextResponse.json({ error: "Online payment isn't switched on yet. Please try again later." }, { status: 503 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const shipLabel = o.fulfillment === "pickup" ? `Pickup at ${o.pickup_location_name ?? "our store"}` : SHIPPING[o.shipping_method as ShippingKey]?.label ?? "Shipping";
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: o.email,
    client_reference_id: o.id,
    metadata: { order_id: o.id, order_number: o.number },
    payment_intent_data: { metadata: { order_id: o.id, order_number: o.number } },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: o.subtotal_cents,
        product_data: { name: `${o.product_name} – ${o.device_name}`, description: "Custom printed phone case" },
        tax_behavior: "exclusive",
      },
    }],
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount", display_name: shipLabel,
        fixed_amount: { amount: o.shipping_cents, currency: "usd" }, tax_behavior: "exclusive",
      },
    }],
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    billing_address_collection: "auto",
    success_url: `${site}/order/${o.id}?t=${o.token}&paid=1`,
    cancel_url: `${site}/design?cancelled=1`,
  });
  } catch (e) {
    console.error("Stripe checkout failed:", (e as Error).message);
    return NextResponse.json({ error: "Payment couldn't be started. Please try again in a moment." }, { status: 502 });
  }

  await s.from("orders").update({ stripe_session_id: session.id }).eq("id", o.id);
  return NextResponse.json({ url: session.url });
}
