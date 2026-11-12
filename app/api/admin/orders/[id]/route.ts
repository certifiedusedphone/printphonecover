import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { setStatus } from "@/lib/server/orders";
import { buyLabel } from "@/lib/server/easypost";
import { SHIPPING, type ShippingKey } from "@/lib/shipping";
import { adminDenied } from "@/lib/server/require-admin";

type Action =
  | { action: "printing" }
  | { action: "ready_pickup" }
  | { action: "confirm_marketplace" }
  | { action: "buy_label" }
  | { action: "manual_ship"; tracking_code: string }
  | { action: "delivered" }
  | { action: "cancel" }
  | { action: "reopen" };

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await adminDenied(); if (denied) return denied;
  const body = (await req.json()) as Action;
  const { data: o } = await db().from("orders").select("*").eq("id", params.id).single();
  if (!o) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  try {
    switch (body.action) {
      case "printing":
        if (o.status !== "paid") throw new Error("Only paid orders can move to Printing.");
        await setStatus(o.id, "printing", {}, "Sent to machine");
        break;
      case "confirm_marketplace": {
        if (!o.channel || o.channel === "web" || o.status !== "pending") throw new Error("Only new marketplace orders can be confirmed.");
        const { data: files } = await db().storage.from("orders").list(o.id);
        if (!files?.some((f) => f.name === "print.png")) throw new Error("The print file didn't upload. Try again.");
        await setStatus(o.id, "paid", {}, `${o.channel === "amazon" ? "Amazon" : "TikTok"} order ${o.channel_order_id} entered by admin`);
        if (o.variant_id) await db().rpc("decrement_stock", { v_id: o.variant_id });
        break;
      }
      case "ready_pickup":
        if (o.fulfillment !== "pickup") throw new Error("This order ships by mail.");
        if (o.status !== "printing" && o.status !== "paid") throw new Error("Print the case first.");
        await setStatus(o.id, "shipped", {}, `Ready for pickup at ${o.pickup_location_name ?? "store"}`);
        break;
      case "buy_label": {
        if (o.fulfillment === "pickup") throw new Error("This is a pickup order. Use Ready for pickup.");
        if (o.status !== "printing" && o.status !== "paid") throw new Error("Print the case before buying a label.");
        if (o.tracking_code) throw new Error("A label was already bought for this order.");
        const service = SHIPPING[o.shipping_method as ShippingKey]?.service ?? "GroundAdvantage";
        const label = await buyLabel(
          { name: o.ship_name, line1: o.ship_line1, line2: o.ship_line2 ?? "", city: o.ship_city, state: o.ship_state, zip: o.ship_zip, email: o.email, phone: o.phone },
          service,
        );
        await setStatus(o.id, "shipped", {
          easypost_shipment_id: label.shipmentId, carrier: label.carrier, tracking_code: label.trackingCode,
          tracking_url: label.trackingUrl, label_url: label.labelUrl,
        }, `USPS ${label.service} label, cost ${(label.costCents / 100).toFixed(2)}`);
        return NextResponse.json({ ok: true, labelUrl: label.labelUrl });
      }
      case "manual_ship": {
        const code = (body.tracking_code || "").replace(/\s/g, "");
        if (!code) throw new Error("Enter a tracking number.");
        await setStatus(o.id, "shipped", {
          carrier: "USPS", tracking_code: code, tracking_url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${code}`,
        }, "Shipped with a label bought outside the site");
        break;
      }
      case "delivered":
        if (o.status !== "shipped") throw new Error("Only shipped or ready orders can be completed.");
        await setStatus(o.id, "delivered", {}, o.fulfillment === "pickup" ? "Picked up by customer" : "Marked delivered by admin");
        break;
      case "cancel":
        if (o.status === "shipped" || o.status === "delivered") throw new Error("This order already shipped.");
        await setStatus(o.id, "cancelled", {}, o.status === "pending" ? "Cancelled before payment" : "Cancelled by admin — refund in Stripe");
        break;
      case "reopen":
        if (o.status !== "printing") throw new Error("Only Printing orders can go back to Paid.");
        await setStatus(o.id, "paid", {}, "Moved back to Paid (reprint)");
        break;
      default:
        throw new Error("Unknown action.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
