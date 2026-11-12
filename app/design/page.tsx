import Studio from "@/components/Studio";
import { getCatalog } from "@/lib/server/catalog";
import { getLocations } from "@/lib/server/locations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design your phone case online – PrintPhoneCover", description: "Choose your phone, upload a photo and design your custom case with a live preview.", alternates: { canonical: "/design" } };

export default async function DesignPage(props: { searchParams: Promise<{ cancelled?: string; model?: string }> }) {
  const searchParams = await props.searchParams;
  const [catalog, locations] = await Promise.all([getCatalog(), getLocations()]);
  if (!catalog.devices.length || !catalog.products.length) {
    return <main className="wrap page"><p>The catalog is empty. Run supabase/seed.sql or add phones in Admin → Catalog.</p></main>;
  }
  return <Studio catalog={catalog} pickups={locations.filter((l) => l.pickup)} cancelled={searchParams.cancelled === "1"} initialModel={searchParams.model} />;
}
