import { notFound } from "next/navigation";
import Link from "next/link";
import { db, signedUrl } from "@/lib/server/db";
import { Logo } from "@/components/Logo";
import { money, STATUS_LABEL, type OrderStatus } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order – PrintPhoneCover" };

const FLOW: OrderStatus[] = ["pending", "paid", "printing", "shipped", "delivered"];

export default async function OrderPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const { data: o } = await db().from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!o || o.token !== searchParams.t) notFound();
  const preview = await signedUrl(o.preview_path);
  // Stripe redirects here right after payment; the webhook may land a few seconds later.
  const justPaid = searchParams.paid === "1" && o.status === "pending";
  const shown: OrderStatus = justPaid ? "paid" : o.status;
  const reached = FLOW.indexOf(shown);

  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn-ghost" href="/design">Design another</Link></div></header>
      <main className="wrap page" style={{ maxWidth: 860 }}>
        <div className="pane-head">
          <span className="eyebrow">Order {o.number}</span>
          <h1 style={{ fontSize: 32 }}>{shown === "cancelled" ? "This order was cancelled" : shown === "pending" ? "Waiting for payment" : shown === "delivered" ? "Delivered" : "Thanks! Your case is in the works."}</h1>
          {justPaid && <p>Payment received. A confirmation email is on its way to {o.email}.</p>}
        </div>
        {shown !== "cancelled" && (
          <ol className="track" aria-label="Order status">
            {FLOW.map((s, i) => <li key={s} className={i <= reached ? "on" : ""}>{STATUS_LABEL[s]}</li>)}
          </ol>
        )}
        <div className="box split">
          {preview ? <img src={preview} alt="Your case design" /> : <div />}
          <dl className="specs-list">
            <dt>Case</dt><dd>{o.product_name}</dd>
            <dt>Phone</dt><dd>{o.device_name}</dd>
            <dt>Ship to</dt><dd>{o.ship_name}<br />{o.ship_line1}{o.ship_line2 ? `, ${o.ship_line2}` : ""}<br />{o.ship_city}, {o.ship_state} {o.ship_zip}</dd>
            <dt>Total</dt><dd>{money(o.total_cents)}</dd>
            {o.tracking_code && (<><dt>Tracking</dt><dd><a href={o.tracking_url ?? "#"} target="_blank" rel="noreferrer">USPS {o.tracking_code}</a></dd></>)}
          </dl>
        </div>
        <p className="note">Bookmark this page to check your order. We also email you when it ships.</p>
      </main>
    </>
  );
}
