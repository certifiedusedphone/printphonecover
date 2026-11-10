"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({ id, status, labelUrl }: { id: string; status: string; labelUrl: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function run(action: string, extra: Record<string, string> = {}, label = "Working…") {
    setBusy(label); setErr("");
    const r = await fetch(`/api/admin/orders/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) { setErr(j.error || "That didn't work."); return; }
    if (j.labelUrl) window.open(j.labelUrl, "_blank");
    router.refresh();
  }

  return (
    <div className="pane" style={{ gap: 10 }}>
      {err && <p className="error">{err}</p>}
      <div className="row">
        {status === "paid" && <button className="btn" disabled={!!busy} onClick={() => run("printing", {}, "Updating…")}>Mark as Printing</button>}
        {(status === "printing" || status === "paid") && <button className="btn" disabled={!!busy} onClick={() => run("buy_label", {}, "Buying USPS label…")}>{busy || "Buy USPS label & mark Shipped"}</button>}
        {status === "printing" && <button className="btn-ghost" disabled={!!busy} onClick={() => run("reopen")}>Back to Paid (reprint)</button>}
        {status === "shipped" && <button className="btn-ghost" disabled={!!busy} onClick={() => run("delivered")}>Mark Delivered</button>}
        {labelUrl && <a className="btn-ghost" href={labelUrl} target="_blank" rel="noreferrer">Print shipping label</a>}
      </div>
      {(status === "printing" || status === "paid") && (
        manual ? (
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label htmlFor="trk">USPS tracking number</label><input id="trk" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <button className="btn-ghost" disabled={!!busy || !code} onClick={() => run("manual_ship", { tracking_code: code })} style={{ alignSelf: "end" }}>Save & mark Shipped</button>
          </div>
        ) : <button className="mini" style={{ alignSelf: "start" }} onClick={() => setManual(true)}>I bought the label somewhere else</button>
      )}
      {status !== "shipped" && status !== "delivered" && status !== "cancelled" && (
        confirmCancel ? (
          <div className="row"><span className="note">Cancel this order? Refund the payment in Stripe afterwards.</span>
            <button className="mini danger" onClick={() => run("cancel")}>Yes, cancel</button><button className="mini" onClick={() => setConfirmCancel(false)}>Keep it</button></div>
        ) : <button className="mini danger" style={{ alignSelf: "start" }} onClick={() => setConfirmCancel(true)}>Cancel order</button>
      )}
    </div>
  );
}
