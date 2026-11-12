import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { geocode } from "@/lib/server/google";
import { adminDenied } from "@/lib/server/require-admin";
import { fullAddress } from "@/lib/locations";

type Loc = {
  id?: string; name: string; line1: string; line2?: string; city: string; state: string; zip: string;
  phone?: string; hours?: string; note?: string; lat?: number | null; lng?: number | null; pickup: boolean; active: boolean; sort?: number;
};

export async function POST(req: Request) {
  const denied = await adminDenied(); if (denied) return denied;
  const b = (await req.json()) as { action: "save"; location: Loc } | { action: "delete"; id: string };
  const s = db();
  try {
    if (b.action === "delete") {
      const r = await s.from("locations").delete().eq("id", b.id);
      if (r.error) throw r.error;
      return NextResponse.json({ ok: true });
    }
    const l = b.location;
    if (!l.name?.trim() || !l.line1?.trim() || !l.city?.trim() || !/^[A-Z]{2}$/.test(l.state) || !/^\d{5}$/.test(l.zip))
      throw new Error("Fill in name, street, city, 2-letter state and 5-digit ZIP.");
    const row = {
      name: l.name.trim(), line1: l.line1.trim(), line2: l.line2?.trim() || null, city: l.city.trim(), state: l.state, zip: l.zip,
      phone: l.phone?.trim() || null, hours: l.hours?.trim() || null, note: l.note?.trim() || null,
      lat: typeof l.lat === "number" && isFinite(l.lat) ? l.lat : null, lng: typeof l.lng === "number" && isFinite(l.lng) ? l.lng : null,
      pickup: !!l.pickup, active: !!l.active, sort: Number.isInteger(l.sort) ? l.sort : 0,
    };
    // Find the map position from the address when it isn't given or the address changed.
    let addressChanged = true;
    if (l.id) {
      const { data: cur } = await s.from("locations").select("line1,line2,city,state,zip").eq("id", l.id).single();
      if (cur) addressChanged = fullAddress(cur) !== fullAddress(row);
    }
    let note = "";
    if (process.env.GOOGLE_MAPS_API_KEY || row.lat == null || row.lng == null || (addressChanged && l.id)) {
      const p = await geocode(fullAddress(row));
      if (p) { row.lat = p.lat; row.lng = p.lng; }
      else if (row.lat == null) note = "Saved, but the map position wasn't found (add the Google key, or type latitude and longitude). Distance sorting skips this location.";
    }
    const r = l.id ? await s.from("locations").update(row).eq("id", l.id) : await s.from("locations").insert(row);
    if (r.error) throw r.error;
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string }).message || "Save failed." }, { status: 400 });
  }
}
