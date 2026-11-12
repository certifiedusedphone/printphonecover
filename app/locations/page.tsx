import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LocationFinder } from "@/components/LocationFinder";
import { getLocations } from "@/lib/server/locations";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
export const metadata = {
  alternates: { canonical: "/locations" },
  title: "Phone Case Printing Machines in Texas – Find a Location | PrintPhoneCover",
  description: "Find the closest PrintPhoneCover phone case machine, design your case there, or pick up your online order.",
};

export default async function LocationsPage() {
  const locations = await getLocations();
  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn" href="/design">Design your case</Link></div></header>
      <main className="wrap page" style={{ maxWidth: 860 }}>
        <div className="pane-head">
          <span className="eyebrow">Our machines</span>
          <h1 style={{ fontSize: 32 }}>Find a phone case machine near you</h1>
          <p>Print a case on the spot, or order online and pick it up at any of these locations.</p>
        </div>
        <LocationFinder locations={locations} />
      </main>
      <SiteFooter />
    </>
  );
}
