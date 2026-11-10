import { db } from "@/lib/server/db";
import { AdminHeader } from "@/components/AdminHeader";
import { CatalogEditor } from "@/components/CatalogEditor";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catalog – PrintPhoneCover Admin" };

export default async function AdminCatalog() {
  await requireAdminPage();
  const s = db();
  const [brands, devices, products, variants] = await Promise.all([
    s.from("brands").select("id,name,active").order("sort"),
    s.from("devices").select("id,brand_id,name,series,active").order("sort"),
    s.from("products").select("id,code,name").order("sort"),
    s.from("variants").select("id,device_id,product_id,price_cents,stock,active,mask_src,mask_url,mask_w,mask_h"),
  ]);
  const devs = (devices.data ?? []).map((d) => ({
    ...d,
    variants: (variants.data ?? []).filter((v) => v.device_id === d.id)
      .sort((a, b) => (products.data ?? []).findIndex((p) => p.id === a.product_id) - (products.data ?? []).findIndex((p) => p.id === b.product_id)),
  }));
  return (
    <>
      <AdminHeader active="catalog" />
      <main className="wrap page">
        <div className="pane-head"><h1 style={{ fontSize: 28 }}>Catalog</h1><p>Phones, case prices, stock and the machine masks.</p></div>
        <CatalogEditor brands={brands.data ?? []} devices={devs} products={products.data ?? []} />
      </main>
    </>
  );
}
