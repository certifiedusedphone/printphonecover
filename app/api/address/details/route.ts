import { NextResponse } from "next/server";
import { placeAddress } from "@/lib/server/google";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id"), session = u.searchParams.get("session") || "";
  if (!id) return NextResponse.json({ error: "Missing place" }, { status: 400 });
  try {
    return NextResponse.json({ address: await placeAddress(id, session) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load that address. Please type it in." }, { status: 502 });
  }
}
