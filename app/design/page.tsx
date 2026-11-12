import Studio from "@/components/Studio";
import { getCatalog } from "@/lib/server/catalog";
import { getLocations } from "@/lib/server/locations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design your case – PrintPhoneCover" };

export default async function DesignPage(props: { searchParams: Promise<{ cancelled?: string }> }) {
  const searchParams = await props.searchParams;
  const [catalog, locations] = await Promise.all([getCatalog(), getLocations()]);
  if (!catalog.devices.length || !catalog.products.length) {
    return <main className="wrap page"><p>The catalog is empty. Run supabase/seed.sql or add phones in Admin → Catalog.</p></main>;
  }
  return <Studio catalog={catalog} pickups={locations.filter((l) => l.pickup)} cancelled={searchParams.cancelled === "1"} />;
}
