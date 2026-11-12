import Link from "next/link";
import { db, signedUrl } from "@/lib/server/db";
import { AdminHeader } from "@/components/AdminHeader";
import { money, STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/shipping";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders – PrintPhoneCover Admin" };

export default async function AdminOrders(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdminPage();
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? "") ? (searchParams.status as OrderStatus) : "paid";
  const s = db();

  const counts = await Promise.all(STATUSES.map(async (st) => {
    const { count } = await s.from("orders").select("id", { count: "exact", head: true }).eq("status", st);
    return [st, count ?? 0] as const;
  }));

  // Paid / Printing are sorted by phone model so staff can batch-print the same model together.
  let q = s.from("orders").select("id,number,status,created_at,email,ship_name,ship_city,ship_state,device_name,product_name,total_cents,address_verified,preview_path,tracking_code,fulfillment,pickup_location_name").eq("status", status);
  q = status === "paid" || status === "printing"
    ? q.order("device_name").order("product_name").order("created_at")
    : q.order("created_at", { ascending: false });
  const { data: orders } = await q.limit(200);
  const rows = await Promise.all((orders ?? []).map(async (o) => ({ ...o, preview: await signedUrl(o.preview_path, 600) })));

  return (
    <>
      <AdminHeader active="orders" />
      <main className="wrap page">
        <div className="filters" aria-label="Order status">
          {counts.map(([st, n]) => (
            <Link key={st} href={`/admin?status=${st}`} aria-current={st === status ? "page" : undefined}>
              {STATUS_LABEL[st]}<span className="count">{n}</span>
            </Link>
          ))}
        </div>
        <div className="box">
          {rows.length === 0 ? <p className="note">No {STATUS_LABEL[status].toLowerCase()} orders.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th></th><th>Order</th><th>Phone / case</th><th>Customer</th><th>Placed</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td>{o.preview && <img src={o.preview} alt="" />}</td>
                      <td><Link href={`/admin/orders/${o.id}`}><b>{o.number}</b></Link><br /><span className={`status ${o.status}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></td>
                      <td>{o.device_name}<br /><span className="note">{o.product_name}</span></td>
                      <td>{o.ship_name}<br /><span className="note">{o.fulfillment === "pickup" ? <b>Pickup · {o.pickup_location_name}</b> : <>{o.ship_city}, {o.ship_state}{!o.address_verified && " · address not USPS-verified"}</>}</span></td>
                      <td>{new Date(o.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      <td className="num">{money(o.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
