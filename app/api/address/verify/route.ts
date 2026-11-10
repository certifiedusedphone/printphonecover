import { NextResponse } from "next/server";
import { verifyAddress } from "@/lib/server/easypost";
import type { Address } from "@/lib/shipping";

// Called when the customer clicks "Continue to payment", before the order is created.
export async function POST(req: Request) {
  const a = (await req.json()) as Address;
  if (!a?.line1 || !a.city || !a.state || !a.zip) return NextResponse.json({ ok: false, message: "Please fill in the full address." }, { status: 400 });
  if (!process.env.EASYPOST_API_KEY) return NextResponse.json({ ok: true, address: a, changed: false, skipped: true });
  try {
    return NextResponse.json(await verifyAddress(a));
  } catch (e) {
    console.error(e);
    // Don't block the sale if the verification service is down; the admin sees it as unverified.
    return NextResponse.json({ ok: true, address: a, changed: false, skipped: true });
  }
}
