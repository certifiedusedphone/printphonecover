import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/server/google";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  const session = u.searchParams.get("session") || "";
  if (q.length < 3 || !session) return NextResponse.json({ suggestions: [] });
  try {
    return NextResponse.json({ suggestions: await autocomplete(q.slice(0, 120), session) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ suggestions: [] });
  }
}
