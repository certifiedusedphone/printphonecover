import { NextResponse } from "next/server";
import { geocode } from "@/lib/server/google";

// Turns a ZIP code or city typed by the customer into a map position, to sort machines by distance.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ error: "Enter a ZIP code or city." }, { status: 400 });
  try {
    const p = await geocode(/^\d{5}$/.test(q) ? `${q}, USA` : q);
    if (!p) return NextResponse.json({ error: "We couldn't find that place. Try a 5-digit ZIP code." }, { status: 404 });
    return NextResponse.json(p);
  } catch {
    return NextResponse.json({ error: "Location search isn't available right now." }, { status: 502 });
  }
}
