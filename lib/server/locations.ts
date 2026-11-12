import "server-only";
import { db } from "./db";
import type { Location } from "@/lib/locations";

export async function getLocations(opts: { all?: boolean } = {}): Promise<Location[]> {
  let q = db().from("locations").select("*").order("sort").order("name");
  if (!opts.all) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) { console.error("locations", error.message); return []; }
  return (data ?? []) as Location[];
}
