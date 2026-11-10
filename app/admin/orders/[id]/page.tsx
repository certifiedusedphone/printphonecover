import { notFound } from "next/navigation";
import Link from "next/link";
import { db, signedUrl } from "@/lib/server/db";
import { AdminHeader } from "@/components/AdminHeader";
import { OrderActions } from "@/components/OrderActions";
import { money, SHIPPING, STATUS_LABEL, type OrderStatus, type ShippingKey } from "@/lib/shipping";
import { requireAdminPage } from "@/lib/server/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const { data: o } = await db().from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!o) notFound();
  const { data: events } = await db().from("order_events").select("*").eq("order_id", o.id).order("created_at");
  const fileName = `${o.number}_${o.device_name}_${o.product_name}`.replace(/[^A-Za-z0-9_-]+/g, "-");
  const [preview, print, printDownload] = await Promise.all([
    signedUrl(o.preview_path),
    signedUrl(o.print_path),
    signedUrl(o.print_path, 3600, `${fileName}.png`),
  ]);
  const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <>
      <AdminHeader active="orders" />
      <main className="wrap page">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pane-head">
            <Link href={`/admin?status=${o.status}`} className="note">← {STATUS_LABEL[o.status as OrderStatus]} orders</Link>
            <h1 style={{ fontSize: 28 }}>{o.number} <span className={`status ${o.status}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></h1>
            <p className="note">Placed {when(o.created_at)}</p>
          </div>
        </div>

        <div className="split">
          <div className="pane" style={{ gap: 10 }}>
            {preview && <img src={preview} alt="Case mock-up" />}
            {print && <img src={print} alt="Print file" className="checker" />}
            {printDownload && <a className="btn block" href={printDownload}>Download print file</a>}
            <p className="note">Load this PNG on the machine for {o.device_name}, {o.product_name}. It is already sized to the print area at 300 dpi.</p>
          </div>

          <div className="pane">
            <div className="box">
              <h2 style={{ fontSize: 18 }}>Next step</h2>
              <OrderActions id={o.id} status={o.status} labelUrl={o.label_url} />
            </div>
            <div className="box">
              <dl className="specs-list">
                <dt>Phone</dt><dd>{o.device_name}</dd>
                <dt>Case</dt><dd>{o.product_name}</dd>
                <dt>Ship to</dt><dd>{o.ship_name}<br />{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ""}<br />{o.ship_city}, {o.ship_state} {o.ship_zip}
                  <br /><span className={o.address_verified ? "okmsg" : "warn"} style={{ display: "inline-block", marginTop: 6 }}>{o.address_verified ? "USPS-verified address" : "Address not verified by USPS — double-check before shipping"}</span></dd>
                <dt>Email</dt><dd>{o.email}</dd>
                {o.phone && (<><dt>Phone</dt><dd>{o.phone}</dd></>)}
                <dt>Shipping</dt><dd>{SHIPPING[o.shipping_method as ShippingKey]?.label ?? o.shipping_method}</dd>
                <dt>Paid</dt><dd>{money(o.subtotal_cents)} case + {money(o.shipping_cents)} shipping + {money(o.tax_cents)} tax = <b>{money(o.total_cents)}</b></dd>
                {o.tracking_code && (<><dt>Tracking</dt><dd><a href={o.tracking_url ?? "#"} target="_blank" rel="noreferrer">USPS {o.tracking_code}</a></dd></>)}
                {o.stripe_payment_intent && (<><dt>Stripe</dt><dd><a href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent}`} target="_blank" rel="noreferrer">{o.stripe_payment_intent}</a></dd></>)}
              </dl>
            </div>
            <div className="box">
              <h2 style={{ fontSize: 18 }}>History</h2>
              <dl className="specs-list">
                <dt>Created</dt><dd>{when(o.created_at)}</dd>
                {(events ?? []).map((e) => (<div key={e.id} style={{ display: "contents" }}><dt>{when(e.created_at)}</dt><dd><b>{STATUS_LABEL[e.status as OrderStatus] ?? e.status}</b>{e.note ? ` · ${e.note}` : ""}</dd></div>))}
              </dl>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
