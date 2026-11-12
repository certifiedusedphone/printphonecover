import type { MetadataRoute } from "next";
import { SITE_URL, slugify } from "@/lib/site";
import { getCatalog } from "@/lib/server/catalog";
import { getLocations } from "@/lib/server/locations";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ["", "/design", "/cases", "/locations", "/contact", "/shipping", "/returns", "/terms", "/privacy"].map((p) => ({
    url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : p === "/design" || p === "/cases" ? 0.9 : 0.5,
  }));
  let models: MetadataRoute.Sitemap = [], places: MetadataRoute.Sitemap = [];
  try {
    const c = await getCatalog();
    const sold = new Set(c.variants.map((v) => v.device_id));
    models = c.devices.filter((d) => sold.has(d.id)).map((d) => ({ url: `${SITE_URL}/cases/${d.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 }));
  } catch { /* catalog not ready */ }
  try {
    places = (await getLocations()).map((l) => ({ url: `${SITE_URL}/locations/${slugify(l.name)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 }));
  } catch { /* locations not ready */ }
  return [...fixed, ...models, ...places];
}
