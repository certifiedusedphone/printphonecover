import { AdminHeader } from "@/components/AdminHeader";
import { MarketplaceOrder } from "@/components/MarketplaceOrder";
import { getCatalog } from "@/lib/server/catalog";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Amazon / TikTok order – PrintPhoneCover Admin" };

export default async function MarketplacePage() {
  await requireAdminPage();
  const catalog = await getCatalog();
  return (
    <>
      <AdminHeader active="marketplace" />
      <main className="wrap page">
        <div className="pane-head"><h1 style={{ fontSize: 28 }}>Add an Amazon or TikTok order</h1>
          <p>Place the buyer&apos;s photo on the machine mask. The order joins the same print queue as website orders.</p></div>
        <MarketplaceOrder catalog={catalog} />
      </main>
    </>
  );
}
