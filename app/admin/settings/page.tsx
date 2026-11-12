import { AdminHeader } from "@/components/AdminHeader";
import { SettingsEditor } from "@/components/SettingsEditor";
import { getSettings } from "@/lib/server/settings";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings – PrintPhoneCover Admin" };

export default async function AdminSettings() {
  await requireAdminPage();
  const s = await getSettings();
  return (
    <>
      <AdminHeader active="settings" />
      <main className="wrap page" style={{ maxWidth: 720 }}>
        <div className="pane-head"><h1 style={{ fontSize: 28 }}>Settings</h1><p>Social media links and business details.</p></div>
        <SettingsEditor initial={s} />
      </main>
    </>
  );
}
