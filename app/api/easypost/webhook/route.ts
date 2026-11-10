import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { setStatus } from "@/lib/server/orders";

// In EasyPost → Webhooks, add: https://printphonecover.com/api/easypost/webhook?secret=YOUR_EASYPOST_WEBHOOK_SECRET
export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.EASYPOST_WEBHOOK_SECRET || secret !== process.env.EASYPOST_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const tracker = body?.result;
  if (body?.description === "tracker.updated" && tracker?.tracking_code && tracker.status === "delivered") {
    const { data: o } = await db().from("orders").select("id,status").eq("tracking_code", tracker.tracking_code).maybeSingle();
    if (o && o.status === "shipped") await setStatus(o.id, "delivered", {}, "USPS delivered");
  }
  return NextResponse.json({ received: true });
}
