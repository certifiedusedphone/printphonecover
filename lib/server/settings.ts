import "server-only";
import { db } from "./db";
import type { Settings } from "@/lib/site";

export async function getSettings(): Promise<Settings> {
  try {
    const { data, error } = await db().from("site_settings").select("key,value");
    if (error) return {};
    return Object.fromEntries((data ?? []).filter((r) => r.value).map((r) => [r.key, r.value])) as Settings;
  } catch { return {}; }
}
