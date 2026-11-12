"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Editor } from "@/lib/design/editor";
import { FONTS, loadTemplate, renderPreview, renderPrintFile, type Catalog, type FontKey, type Template } from "@/lib/design/render";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { readJson } from "@/lib/fetch-json";
import type { Address } from "@/lib/shipping";

type Channel = "amazon" | "tiktok";

/**
 * Admin screen for Amazon / TikTok orders: put the buyer's photo on the same machine
 * mask the website uses, and create a Paid order in the normal print queue.
 */
export function MarketplaceOrder({ catalog }: { catalog: Catalog }) {
  const [channel, setChannel] = useState<Channel>("amazon");
  const [orderNo, setOrderNo] = useState("");
  const [brand, setBrand] = useState(catalog.brands[0]?.id ?? "");
  const devices = useMemo(() => catalog.devices.filter((d) => d.brand_id === brand), [catalog.devices, brand]);
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const variants = catalog.variants.filter((v) => v.device_id === deviceId);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const variant = catalog.variants.find((v) => v.id === variantId) ?? variants[0];
  const product = catalog.products.find((p) => p.id === variant?.product_id);

  useEffect(() => { if (!devices.some((d) => d.id === deviceId)) setDeviceId(devices[0]?.id ?? ""); }, [devices, deviceId]);
  useEffect(() => { if (!variants.some((v) => v.id === variantId)) setVariantId(variants[0]?.id ?? ""); }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const edRef = useRef<Editor | null>(null);
  if (!edRef.current) { edRef.current = new Editor(); edRef.current.design = { bg: { kind: "color", value: "#FFFFFF" }, layers: [] }; }
  const ed = edRef.current!;
  useSyncExternalStore(ed.subscribe, () => ed.version, () => 0);
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (cvRef.current) { ed.attach(cvRef.current); ed.resetHistory(); } return () => ed.detach(); }, [ed]);

  const [T, setT] = useState<Template | null>(null);
  const [maskErr, setMaskErr] = useState("");
  useEffect(() => {
    if (!variant?.mask) return;
    let live = true; setMaskErr("");
    loadTemplate(variant.mask).then((t) => { if (live) { ed.setTemplate(t); setT(t); } }).catch((e: Error) => live && setMaskErr(e.message));
    return () => { live = false; };
  }, [variant?.mask, ed]);
  useEffect(() => { if (product) ed.setFinish(product.finish); }, [product, ed]);

  const [addr, setAddr] = useState<Address>({ name: "", line1: "", line2: "", city: "", state: "", zip: "" });
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [speed, setSpeed] = useState<"standard" | "priority">("standard");
  const [paid, setPaid] = useState("");
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontKey>("bold");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const L = ed.selected();
  const pct = L ? Math.round((L.s / L.base) * 100) : 100;
  const deg = L ? Math.round((((L.rot * 180) / Math.PI + 540) % 360) - 180) : 0;
  const set = (p: Partial<Address>) => setAddr({ ...addr, ...p });

  async function addPhoto(f?: File | null) {
    if (!f) return; setErr("");
    try { await ed.addImage(f); } catch (e) { setErr((e as Error).message); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!T || !variant || !product) { setErr("Choose the phone and case first."); return; }
    if (!ed.design.layers.some((l) => l.type === "image")) { setErr("Upload the buyer's photo first."); return; }
    try {
      setBusy("Making print file…"); ed.select(null);
      const [print, preview] = await Promise.all([renderPrintFile(T, ed.design, ed.images), renderPreview(T, product.finish, ed.design, ed.images)]);
      setBusy("Saving order…");
      const c = await fetch("/api/admin/marketplace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, channelOrderId: orderNo, variantId: variant.id, address: { ...addr, state: addr.state.toUpperCase() }, phone, email, shipping: speed, paidCents: paid ? Math.round(Number(paid) * 100) : undefined, design: ed.design }),
      }).then((r) => readJson<{ orderId: string; uploads: { print: { path: string; token: string }; preview: { path: string; token: string } } }>(r));
      if (c.error) throw new Error(c.error);
      setBusy("Uploading print file…");
      const store = supabaseBrowser().storage.from("orders");
      const up = await Promise.all([
        store.uploadToSignedUrl(c.uploads.print.path, c.uploads.print.token, print, { contentType: "image/png" }),
        store.uploadToSignedUrl(c.uploads.preview.path, c.uploads.preview.token, preview, { contentType: "image/jpeg" }),
      ]);
      if (up.some((u) => u.error)) throw new Error("Upload failed. Check the connection and try again.");
      const ok = await fetch(`/api/admin/orders/${c.orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm_marketplace" }) }).then((r) => readJson(r));
      if (ok.error) throw new Error(ok.error);
      window.location.href = `/admin/orders/${c.orderId}`;
    } catch (e2) { setErr((e2 as Error).message); setBusy(""); }
  }

  return (
    <div className="layout" style={{ paddingBlock: 0 }}>
      <section className="stage" aria-label="Print preview">
        <div className="bed"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addPhoto(e.dataTransfer.files[0]); }}>
          <canvas ref={cvRef} tabIndex={0} aria-label="Case preview. Drag the photo to move it; drag the round handle to resize and rotate." />
        </div>
        <div className="stagebar">
          <button type="button" className="icon-btn" disabled={!ed.canUndo} onClick={() => ed.undo()}>Undo</button>
          <button type="button" className="icon-btn" disabled={!ed.canRedo} onClick={() => ed.redo()}>Redo</button>
          <span className="specs">{T ? `Print layout ${T.W} × ${T.H} px` : maskErr || "Loading mask…"}</span>
        </div>
      </section>

      <form className="panel" onSubmit={save}>
        <div className="seg" role="group" aria-label="Marketplace">
          <button type="button" aria-pressed={channel === "amazon"} onClick={() => setChannel("amazon")}>Amazon</button>
          <button type="button" aria-pressed={channel === "tiktok"} onClick={() => setChannel("tiktok")}>TikTok Shop</button>
        </div>
        <div className="field"><label htmlFor="mo">{channel === "amazon" ? "Amazon order ID" : "TikTok order ID"}</label>
          <input id="mo" required value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder={channel === "amazon" ? "112-1234567-1234567" : "576…"} /></div>

        <div className="three">
          <div className="field"><label htmlFor="mb">Brand</label>
            <select id="mb" value={brand} onChange={(e) => setBrand(e.target.value)}>{catalog.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label htmlFor="md">Phone</label>
            <select id="md" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>{devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="field"><label htmlFor="mc">Case</label>
            <select id="mc" value={variant?.id ?? ""} onChange={(e) => setVariantId(e.target.value)}>
              {variants.map((v) => { const p = catalog.products.find((x) => x.id === v.product_id); return <option key={v.id} value={v.id}>{p?.code ?? v.product_id}</option>; })}
            </select></div>
        </div>

        <label className="drop-zone" htmlFor="mphoto">
          <strong>Upload the buyer&apos;s photo</strong>
          <span>{channel === "amazon" ? "Download it from the order's customization in Seller Central." : "Save it from the buyer's TikTok Shop message."} You can also drop it on the case.</span>
          <input type="file" id="mphoto" accept="image/*" onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </label>

        {L && (
          <div className="sel">
            <div className="range"><label htmlFor="ms">Size</label>
              <input type="range" id="ms" min={10} max={300} value={Math.min(300, Math.max(10, pct))} onChange={(e) => { L.s = (L.base * Number(e.target.value)) / 100; ed.changed(); }} onPointerUp={() => ed.commit()} />
              <output>{pct}%</output></div>
            <div className="range"><label htmlFor="mr">Rotate</label>
              <input type="range" id="mr" min={-180} max={180} value={deg} onChange={(e) => { L.rot = (Number(e.target.value) * Math.PI) / 180; ed.changed(); }} onPointerUp={() => ed.commit()} />
              <output>{deg}°</output></div>
            {L.type === "image" && 300 / L.s < 150 && <p className="warn">Photo is stretched to about {Math.round(300 / L.s)} dpi and may print blurry.</p>}
            <div className="row">
              <button type="button" className="mini" onClick={() => ed.center()}>Center</button>
              {L.type === "image" && <button type="button" className="mini" onClick={() => ed.fill()}>Fill case</button>}
              <button type="button" className="mini danger" onClick={() => ed.remove()}>Delete</button>
            </div>
          </div>
        )}

        <details>
          <summary className="note">Add text (if the buyer asked for it)</summary>
          <div className="pane" style={{ gap: 8, marginTop: 8 }}>
            <input aria-label="Text" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} />
            <div className="fonts">
              {(Object.keys(FONTS) as FontKey[]).map((k) => <button type="button" key={k} aria-pressed={font === k} style={{ fontFamily: FONTS[k].css, fontWeight: FONTS[k].weight }} onClick={() => setFont(k)}>{FONTS[k].label}</button>)}
            </div>
            <button type="button" className="mini" onClick={() => text.trim() && ed.addText(text.trim(), font, "#FFFFFF")}>Add text</button>
          </div>
        </details>

        <fieldset>
          <legend>Ship to (from the marketplace order)</legend>
          <div className="field"><label htmlFor="mn">Name</label><input id="mn" required value={addr.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="field"><label htmlFor="m1">Street</label><input id="m1" required value={addr.line1} onChange={(e) => set({ line1: e.target.value })} /></div>
          <div className="field"><label htmlFor="m2">Apt / suite</label><input id="m2" value={addr.line2 ?? ""} onChange={(e) => set({ line2: e.target.value })} /></div>
          <div className="three">
            <div className="field"><label htmlFor="mcity">City</label><input id="mcity" required value={addr.city} onChange={(e) => set({ city: e.target.value })} /></div>
            <div className="field"><label htmlFor="mst">State</label><input id="mst" required maxLength={2} value={addr.state} onChange={(e) => set({ state: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label htmlFor="mzip">ZIP</label><input id="mzip" required maxLength={10} value={addr.zip} onChange={(e) => set({ zip: e.target.value.replace(/[^0-9-]/g, "") })} /></div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor="mph">Phone (optional)</label><input id="mph" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field"><label htmlFor="mem">Email (optional)</label><input id="mem" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor="msp">Shipping the buyer paid for</label>
              <select id="msp" value={speed} onChange={(e) => setSpeed(e.target.value as "standard" | "priority")}><option value="standard">Standard</option><option value="priority">Expedited / Priority</option></select></div>
            <div className="field"><label htmlFor="mpd">Amount paid $ (optional)</label><input id="mpd" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={variant ? (variant.price_cents / 100).toFixed(2) : ""} /></div>
          </div>
        </fieldset>

        {err && <p className="error">{err}</p>}
        <button className="btn block" disabled={!!busy}>{busy || "Add to print queue"}</button>
        <p className="note">The order goes to Paid in the normal queue. No emails are sent to marketplace buyers. After shipping, enter the tracking number in {channel === "amazon" ? "Amazon Seller Central" : "TikTok Seller Center"}.</p>
      </form>
    </div>
  );
}
