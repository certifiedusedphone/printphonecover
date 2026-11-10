import "server-only";
import { db } from "./db";
import type { Catalog } from "@/lib/design/render";

export async function getCatalog(): Promise<Catalog> {
  const s = db();
  const [brands, devices, products, variants] = await Promise.all([
    s.from("brands").select("id,name,active").order("sort"),
    s.from("devices").select("id,brand_id,name,geometry").eq("active", true).order("sort"),
    s.from("products").select("id,code,name,description,finish").eq("active", true).order("sort"),
    s.from("variants").select("id,device_id,product_id,price_cents,stock").eq("active", true),
  ]);
  for (const r of [brands, devices, products, variants]) if (r.error) throw r.error;
  return {
    brands: brands.data ?? [],
    devices: devices.data ?? [],
    products: products.data ?? [],
    variants: variants.data ?? [],
  } as Catalog;
}
