import Studio from "@/components/Studio";
import { getCatalog } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design your case – PrintPhoneCover" };

export default async function DesignPage(props: { searchParams: Promise<{ cancelled?: string }> }) {
  const searchParams = await props.searchParams;
  const catalog = await getCatalog();
  if (!catalog.devices.length || !catalog.products.length) {
    return <main className="wrap page"><p>The catalog is empty. Run supabase/seed.sql or add phones in Admin → Catalog.</p></main>;
  }
  return <Studio catalog={catalog} cancelled={searchParams.cancelled === "1"} />;
}
