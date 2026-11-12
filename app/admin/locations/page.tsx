import { AdminHeader } from "@/components/AdminHeader";
import { LocationsEditor } from "@/components/LocationsEditor";
import { getLocations } from "@/lib/server/locations";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Locations – PrintPhoneCover Admin" };

export default async function AdminLocations() {
  await requireAdminPage();
  const locations = await getLocations({ all: true });
  return (
    <>
      <AdminHeader active="locations" />
      <main className="wrap page" style={{ maxWidth: 860 }}>
        <div className="pane-head"><h1 style={{ fontSize: 28 }}>Machine locations</h1><p>Shown on the Find a machine page, and offered as pickup points at checkout.</p></div>
        <LocationsEditor locations={locations} />
      </main>
    </>
  );
}
