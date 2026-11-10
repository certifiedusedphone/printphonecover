import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, cryptoProvider } from "@/lib/server/stripe";
import { db } from "@/lib/server/db";
import { setStatus } from "@/lib/server/orders";

// In Stripe → Developers → Webhooks, send these events to https://printphonecover.com/api/stripe/webhook:
// checkout.session.completed, checkout.session.async_payment_succeeded
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, sig || "", process.env.STRIPE_WEBHOOK_SECRET || "", undefined, cryptoProvider);
  } catch (e) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId && session.payment_status === "paid") {
      const { data: o } = await db().from("orders").select("id,status,variant_id").eq("id", orderId).single();
      if (o && o.status === "pending") {
        await setStatus(o.id, "paid", {
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          tax_cents: session.total_details?.amount_tax ?? 0,
          total_cents: session.amount_total ?? undefined,
        }, "Paid through Stripe");
        if (o.variant_id) await db().rpc("decrement_stock", { v_id: o.variant_id });
      }
    }
  }
  return NextResponse.json({ received: true });
}
