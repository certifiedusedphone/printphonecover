"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Editor } from "@/lib/design/editor";
import {
  COLORS, FONTS, PATTERNS, STICKERS, loadTemplate, renderPreview, renderPrintFile,
  type Catalog, type FontKey, type Template,
} from "@/lib/design/render";
import { SHIPPING, money, type Address, type ShippingKey } from "@/lib/shipping";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { readJson } from "@/lib/fetch-json";
import { AddressFields } from "./AddressFields";
import { CaseThumb, StickerThumb } from "./CaseThumb";
import { Logo } from "./Logo";
import { LocationFinder } from "./LocationFinder";
import type { Location } from "@/lib/locations";

const half = PATTERNS.halftone.draw;
const heart = (c: CanvasRenderingContext2D, W: number, H: number) => { c.save(); c.translate(W / 2, H * 0.58); c.scale(W / 520, W / 520); STICKERS.heart.draw(c, "#E4007C"); c.restore(); };
const TABS = [["photo", "Photo"], ["text", "Text"], ["bg", "Background"], ["designs", "Designs"], ["stickers", "Stickers"]] as const;
type Tab = (typeof TABS)[number][0];
type AddrCheck = null | { kind: "suggest"; suggested: Address } | { kind: "bad"; message: string };

export default function Studio({ catalog, pickups = [], cancelled }: { catalog: Catalog; pickups?: Location[]; cancelled?: boolean }) {
  const firstBrand: string = catalog.brands.find((b) => b.active)?.id ?? catalog.brands[0]?.id ?? "";
  const firstDevice: string = catalog.devices.find((d) => d.brand_id === firstBrand)?.id ?? catalog.devices[0]?.id ?? "";
  const firstProduct: string = catalog.products.find((p) => catalog.variants.some((v) => v.device_id === firstDevice && v.product_id === p.id))?.id ?? catalog.products[0]?.id ?? "";
  const [brand, setBrand] = useState<string>(firstBrand);
  const [deviceId, setDeviceId] = useState<string>(firstDevice);
  const [productId, setProductId] = useState<string>(firstProduct);
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<Tab>("photo");
  const [newText, setNewText] = useState("Made by you");
  const [newFont, setNewFont] = useState<FontKey>("bold");
  const [newColor, setNewColor] = useState("#FFFFFF");
  const [photoError, setPhotoError] = useState("");

  const device = catalog.devices.find((d) => d.id === deviceId)!;
  const product = catalog.products.find((p) => p.id === productId)!;
  const variant = catalog.variants.find((v) => v.device_id === deviceId && v.product_id === productId);

  const edRef = useRef<Editor | null>(null);
  if (!edRef.current) { edRef.current = new Editor(); edRef.current.finish = product?.finish ?? "solid"; }
  const ed = edRef.current!;
  useSyncExternalStore(ed.subscribe, () => ed.version, () => 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    ed.attach(canvasRef.current); ed.resetHistory();
    document.fonts?.ready.then(() => Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`${f.weight} 40px ${f.css}`).catch(() => null))))
      .then(() => { ed.remeasureText(); ed.resetHistory(); });
    return () => ed.detach();
  }, [ed]);

  // Load the machine's mask for the chosen phone + case.
  const [T, setT] = useState<Template | null>(null);
  const [tplError, setTplError] = useState("");
  const seeded = useRef(false);
  const maskUrl = variant?.mask ?? null;
  useEffect(() => {
    if (!maskUrl) return;
    let live = true; setTplError("");
    loadTemplate(maskUrl).then((t) => {
      if (!live) return;
      ed.setTemplate(t);
      if (!seeded.current) { seeded.current = true; ed.seedSample(); ed.resetHistory(); }
      setT(t);
    }).catch((e: Error) => live && setTplError(e.message));
    return () => { live = false; };
  }, [maskUrl, ed]);

  function chooseDevice(id: string) {
    setDeviceId(id);
    const has = (pid: string) => catalog.variants.some((v) => v.device_id === id && v.product_id === pid);
    if (!has(productId)) { const first = catalog.products.find((p) => has(p.id)); if (first) setProductId(first.id); }
    go(2);
  }
  useEffect(() => { if (product) ed.setFinish(product.finish); }, [product, ed]);

  function go(n: number) { if (n !== 3) ed.select(null); setStep(n); }

  async function addFile(f?: File | null) {
    if (!f) return; setPhotoError("");
    try { await ed.addImage(f); setStep(3); } catch (e) { setPhotoError((e as Error).message); }
  }

  /* ---------- checkout ---------- */
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>({ name: "", line1: "", line2: "", city: "", state: "", zip: "" });
  const [ship, setShip] = useState<ShippingKey>("standard");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [check, setCheck] = useState<AddrCheck>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">("ship");
  const [pickup, setPickup] = useState<Location | null>(null);
  const shipCents = fulfillment === "pickup" ? 0 : SHIPPING[ship].cents;
  const total = (variant?.price_cents ?? 0) + shipCents;
  const lowDpi = ed.lowestPhotoDpi();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setCheck(null);
    if (!formRef.current?.checkValidity()) { formRef.current?.reportValidity(); return; }
    if (fulfillment === "pickup") {
      if (!pickup) { setError("Choose where you'll pick up your case."); return; }
      await placeOrder(address, false); return;
    }
    setBusy("Checking your address with USPS…");
    try {
      const r = await fetch("/api/address/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(address) }).then((x) => readJson<{ ok: boolean; message?: string; changed?: boolean; skipped?: boolean; address: Address }>(x));
      if (r.error) { setError(r.error); setBusy(""); return; }
      if (!r.ok) { setCheck({ kind: "bad", message: r.message ?? "" }); setBusy(""); return; }
      if (r.changed) { setCheck({ kind: "suggest", suggested: r.address }); setBusy(""); return; }
      await placeOrder(address, !r.skipped);
    } catch { setError("Something went wrong. Please try again."); setBusy(""); }
  }

  async function placeOrder(addr: Address, verified: boolean) {
    setCheck(null); setError("");
    if (!variant || !T) { setError("This case isn't available for that phone."); return; }
    try {
      setBusy("Preparing your print file…");
      ed.select(null);
      const [print, preview] = await Promise.all([
        renderPrintFile(T, ed.design, ed.images),
        renderPreview(T, product.finish, ed.design, ed.images),
      ]);
      setBusy("Saving your order…");
      const created = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, design: ed.design, email, phone, address: addr, addressVerified: verified, shipping: ship, fulfillment, pickupLocationId: pickup?.id }),
      }).then(async (x) => ({ ok: x.ok, j: await readJson<{ orderId: string; token: string; uploads: { print: { path: string; token: string }; preview: { path: string; token: string } } }>(x) }));
      if (!created.ok) throw new Error(created.j.error || "Could not create the order.");
      const { orderId, token, uploads } = created.j;
      setBusy("Uploading your design…");
      const store = supabaseBrowser().storage.from("orders");
      const up = await Promise.all([
        store.uploadToSignedUrl(uploads.print.path, uploads.print.token, print, { contentType: "image/png" }),
        store.uploadToSignedUrl(uploads.preview.path, uploads.preview.token, preview, { contentType: "image/jpeg" }),
      ]);
      if (up.some((u) => u.error)) throw new Error("The upload didn't finish. Check your connection and try again.");
      setBusy("Opening secure payment…");
      const pay = await fetch(`/api/orders/${orderId}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
        .then(async (x) => ({ ok: x.ok, j: await readJson<{ url?: string }>(x) }));
      if (!pay.ok || !pay.j.url) throw new Error(pay.j.error || "Could not open payment.");
      window.location.href = pay.j.url;
    } catch (err) { setError((err as Error).message); setBusy(""); }
  }

  /* ---------- selected layer ---------- */
  const L = step === 3 ? ed.selected() : null;
  const pct = L ? Math.round((L.s / L.base) * 100) : 100;
  const deg = L ? Math.round((((L.rot * 180) / Math.PI + 540) % 360) - 180) : 0;
  const W = T?.W ?? 0, H = T?.H ?? 0;
  const mm = (p: number) => Math.round((p / 300) * 25.4);

  const seriesGroups = useMemo(() => {
    const groups: { series: string; devices: typeof catalog.devices }[] = [];
    catalog.devices.filter((d) => d.brand_id === brand).forEach((d) => {
      const key = d.series || "";
      let g = groups.find((x) => x.series === key);
      if (!g) { g = { series: key, devices: [] }; groups.push(g); }
      g.devices.push(d);
    });
    return groups;
  }, [catalog.devices, brand]);

  return (
    <>
      <header className="top">
        <div className="wrap top-in">
          <Logo />
          <ol className="steps">
            {["Phone", "Case", "Design", "Checkout"].map((label, i) => (
              <li key={label}>
                <button aria-current={step === i + 1 ? "step" : undefined} className={step > i + 1 ? "done" : ""} onClick={() => go(i + 1)}>
                  <span className="n">{i + 1}</span><span className="lbl">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className={`wrap layout${step < 3 ? " picker-mode" : ""}`}>
        <section className="stage" aria-label="Case preview" hidden={step < 3}>
          <div className="bed" ref={bedRef}
            onDragOver={(e) => { e.preventDefault(); bedRef.current?.classList.add("drop"); }}
            onDragLeave={() => bedRef.current?.classList.remove("drop")}
            onDrop={(e) => { e.preventDefault(); bedRef.current?.classList.remove("drop"); addFile(e.dataTransfer.files[0]); }}>
            <canvas ref={canvasRef} tabIndex={0} aria-label="Phone case preview. Drag items to move them; drag the round handle to resize and rotate."
              onPointerDown={() => step !== 3 && setStep(3)} />
            <div className="bedtag"><span className="cmyk" aria-hidden="true"><i style={{ background: "#00A0E9" }} /><i style={{ background: "#E4007C" }} /><i style={{ background: "#FFD400" }} /><i style={{ background: "#17141C" }} /></span>Print bed · 300 dpi</div>
          </div>
          <div className="stagebar">
            <button className="icon-btn" disabled={!ed.canUndo} onClick={() => ed.undo()}>Undo</button>
            <button className="icon-btn" disabled={!ed.canRedo} onClick={() => ed.redo()}>Redo</button>
            <span className="specs">{T ? `Print layout ${W} × ${H} px · ${mm(W)} × ${mm(H)} mm` : tplError || "Loading case outline…"}</span>
          </div>
        </section>

        <section className="panel">
          <div className="summary">
            <span className="chip"><b>{device.name}</b></span>
            <span className="chip"><b>{product.code}</b> {product.name}</span>
            {variant && <span className="chip"><b>{money(variant.price_cents)}</b></span>}
          </div>
          {cancelled && step === 1 && <p className="warn">Payment was cancelled, so you weren&apos;t charged. Design your case again whenever you&apos;re ready.</p>}

          {step === 1 && (
            <div className="pane">
              <div className="pane-head"><span className="eyebrow">Step 1</span><h2>Which phone do you have?</h2><p>Pick your exact model so the camera cutout lines up. Then choose a case and start designing.</p></div>
              <div className="brands">
                {catalog.brands.map((b) => (
                  <button key={b.id} disabled={!b.active} aria-pressed={b.id === brand} onClick={() => setBrand(b.id)}>
                    {b.name}{!b.active && <small>Soon</small>}
                  </button>
                ))}
              </div>
              {seriesGroups.map((g) => (
                <div key={g.series} className="pane" style={{ gap: 8 }}>
                  {seriesGroups.length > 1 && <span className="eyebrow" style={{ color: "var(--muted)" }}>{g.series}</span>}
                  <div className="models">
                    {g.devices.map((d) => (
                      <button key={d.id} className="model" aria-pressed={d.id === deviceId} onClick={() => chooseDevice(d.id)}>{d.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="pane">
              <div className="pane-head"><span className="eyebrow">Step 2</span><h2>Choose your case</h2><p>Cases available for {device.name}.</p></div>
              {catalog.products.map((p) => {
                const v = catalog.variants.find((x) => x.device_id === deviceId && x.product_id === p.id);
                if (!v) return null;
                const out = v.stock <= 0;
                return (
                  <button key={p.id} className="case" disabled={out} aria-pressed={p.id === productId} onClick={() => { setProductId(p.id); go(3); }}>
                    <CaseThumb mask={v.mask} finish={p.finish} content={p.finish === "solid" ? half : heart} width={76} height={130} />
                    <div>
                      <h3>{p.name}<span className="code">{p.code}</span></h3>
                      <p>{p.description}</p>
                      <span className="price">{money(v.price_cents)}</span>{out && <span className="note"> · Out of stock</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="pane">
              <div className="pane-head"><span className="eyebrow">Step 3</span><h2>Design it</h2><p>Add a photo, text or stickers. Tap anything on the case to edit it.</p></div>

              {L && (
                <div className="sel">
                  <div className="sel-head"><span>Selected: {L.type === "image" ? "Photo" : L.type === "text" ? "Text" : "Sticker"}</span><button className="mini" onClick={() => ed.select(null)}>Done</button></div>
                  {L.type === "text" && (
                    <>
                      <div className="field"><label htmlFor="selText">Text</label>
                        <input id="selText" maxLength={40} value={L.text} onChange={(e) => { L.text = e.target.value || " "; ed.remeasureText(); }} onBlur={() => ed.commit()} /></div>
                      <div className="fonts">
                        {(Object.keys(FONTS) as FontKey[]).map((k) => (
                          <button key={k} aria-pressed={L.font === k} style={{ fontFamily: FONTS[k].css, fontWeight: FONTS[k].weight }}
                            onClick={() => { L.font = k; ed.remeasureText(); ed.commit(); }}>{FONTS[k].label}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="range"><label htmlFor="selSize">Size</label>
                    <input type="range" id="selSize" min={10} max={300} value={Math.min(300, Math.max(10, pct))}
                      onChange={(e) => { L.s = (L.base * Number(e.target.value)) / 100; ed.changed(); }} onPointerUp={() => ed.commit()} onKeyUp={() => ed.commit()} />
                    <output>{pct}%</output></div>
                  <div className="range"><label htmlFor="selRot">Rotate</label>
                    <input type="range" id="selRot" min={-180} max={180} value={deg}
                      onChange={(e) => { L.rot = (Number(e.target.value) * Math.PI) / 180; ed.changed(); }} onPointerUp={() => ed.commit()} onKeyUp={() => ed.commit()} />
                    <output>{deg}°</output></div>
                  {L.type !== "image" && (
                    <div className="swatches">
                      {COLORS.map((c) => <button key={c} className="sw" style={{ background: c }} aria-label={"Color " + c} aria-pressed={L.color === c} onClick={() => { L.color = c; ed.changed(true); }} />)}
                    </div>
                  )}
                  {L.type === "image" && 300 / L.s < 150 && (
                    <p className="warn">This photo is stretched to about {Math.round(300 / L.s)} dpi, so it may print blurry. Make it smaller or upload a larger original.</p>
                  )}
                  <div className="row">
                    <button className="mini" onClick={() => ed.center()}>Center</button>
                    {L.type === "image" && <button className="mini" onClick={() => ed.fill()}>Fill case</button>}
                    <button className="mini" onClick={() => { L.flip = !L.flip; ed.changed(true); }}>Flip</button>
                    <button className="mini" onClick={() => ed.reorder(1)}>Bring forward</button>
                    <button className="mini" onClick={() => ed.reorder(-1)}>Send back</button>
                    <button className="mini danger" onClick={() => ed.remove()}>Delete</button>
                  </div>
                </div>
              )}

              <div className="tabs" role="tablist">
                {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>)}
              </div>

              {tab === "photo" && (
                <div className="tabpane">
                  {photoError && <p className="error">{photoError}</p>}
                  <label className="drop-zone" htmlFor="file">
                    <strong>Upload a photo</strong>
                    <span>JPG or PNG from your phone or computer. You can also drop it on the case.</span>
                    <input type="file" id="file" accept="image/*" onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  <p className="note">For a sharp print, use the original photo, not a screenshot. About {W} × {H} pixels or larger fills the whole case at full quality.</p>
                </div>
              )}
              {tab === "text" && (
                <div className="tabpane">
                  <div className="field"><label htmlFor="newText">Your text</label><input id="newText" maxLength={40} value={newText} onChange={(e) => setNewText(e.target.value)} /></div>
                  <div className="fonts">
                    {(Object.keys(FONTS) as FontKey[]).map((k) => (
                      <button key={k} aria-pressed={newFont === k} style={{ fontFamily: FONTS[k].css, fontWeight: FONTS[k].weight }} onClick={() => setNewFont(k)}>{FONTS[k].label}</button>
                    ))}
                  </div>
                  <div className="swatches">
                    {COLORS.map((c) => <button key={c} className="sw" style={{ background: c }} aria-label={"Text color " + c} aria-pressed={newColor === c} onClick={() => setNewColor(c)} />)}
                  </div>
                  <button className="btn" onClick={() => ed.addText(newText.trim(), newFont, newColor)}>Add text</button>
                </div>
              )}
              {tab === "bg" && (
                <div className="tabpane">
                  <p className="note">Fills the whole case behind your photo and text.</p>
                  <div className="swatches">
                    {COLORS.map((c) => <button key={c} className="sw" style={{ background: c }} aria-label={"Background " + c}
                      aria-pressed={ed.design.bg.kind === "color" && ed.design.bg.value === c} onClick={() => ed.setBg({ kind: "color", value: c })} />)}
                  </div>
                </div>
              )}
              {tab === "designs" && (
                <div className="thumbs">
                  {Object.entries(PATTERNS).map(([id, P]) => (
                    <button key={id} className="thumb" aria-pressed={ed.design.bg.kind === "pattern" && ed.design.bg.id === id} onClick={() => ed.setBg({ kind: "pattern", id })}>
                      <CaseThumb template={T} finish={product.finish} content={P.draw} width={56} height={96} />{P.name}
                    </button>
                  ))}
                </div>
              )}
              {tab === "stickers" && (
                <div className="thumbs">
                  {Object.entries(STICKERS).map(([id, S]) => (
                    <button key={id} className="thumb" onClick={() => ed.addSticker(id)}><StickerThumb draw={S.draw} color={S.color} />{S.name}</button>
                  ))}
                </div>
              )}

              {lowDpi < 150 && !L && <p className="warn">One of your photos may print blurry. Tap it to see details.</p>}
              <div className="foot">
                <button className="btn-ghost" onClick={() => go(2)}>Back</button>
                <button className="btn" onClick={() => go(4)}>Continue to checkout</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pane">
              <div className="pane-head"><span className="eyebrow">Step 4</span><h2>{fulfillment === "pickup" ? "Pickup and payment" : "Shipping and payment"}</h2>
                <p>{fulfillment === "pickup" ? "We print your case and have it waiting at the machine location you choose." : "We print your case and ship it anywhere in the United States."}</p></div>
              <form className="checkout" ref={formRef} noValidate onSubmit={submit}>
                {pickups.length > 0 && (
                  <div className="seg" role="group" aria-label="How do you want your case?">
                    <button type="button" aria-pressed={fulfillment === "ship"} onClick={() => { setFulfillment("ship"); setError(""); }}>Ship to me</button>
                    <button type="button" aria-pressed={fulfillment === "pickup"} onClick={() => { setFulfillment("pickup"); setCheck(null); setError(""); }}>Pick up · Free</button>
                  </div>
                )}
                <div className="two">
                  <div className="field"><label htmlFor="email">Email for order updates</label>
                    <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="field"><label htmlFor="phone">{fulfillment === "pickup" ? "Phone" : "Phone (optional)"}</label>
                    <input id="phone" type="tel" autoComplete="tel" required={fulfillment === "pickup"} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                {fulfillment === "pickup" ? (
                  <>
                    <div className="field"><label htmlFor="pname">Name for pickup</label>
                      <input id="pname" required autoComplete="name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} /></div>
                    <fieldset>
                      <legend>Pick up at</legend>
                      <p className="note">We&apos;ll email you when it&apos;s ready. In a hurry? You can also walk up to any machine and print a case on the spot in a few minutes.</p>
                      <LocationFinder locations={pickups} selectedId={pickup?.id} onSelect={(l) => { setPickup(l); setError(""); }} />
                    </fieldset>
                  </>
                ) : (
                  <AddressFields value={address} onChange={(a) => { setAddress(a); setCheck(null); }} />
                )}

                {check?.kind === "suggest" && (
                  <div className="addr-check">
                    <strong>USPS has a slightly different version of this address</strong>
                    <address>{check.suggested.line1}{check.suggested.line2 ? `, ${check.suggested.line2}` : ""}<br />{check.suggested.city}, {check.suggested.state} {check.suggested.zip}</address>
                    <div className="row">
                      <button type="button" className="btn" disabled={!!busy} onClick={() => { const a = { ...check.suggested, name: address.name }; setAddress(a); placeOrder(a, true); }}>Use this address</button>
                      <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => placeOrder(address, false)}>Keep what I typed</button>
                    </div>
                  </div>
                )}
                {check?.kind === "bad" && (
                  <div className="addr-check">
                    <p className="error">USPS couldn&apos;t confirm this address. {check.message}</p>
                    <p className="note">Check the street number, apartment and ZIP. If you&apos;re sure it&apos;s right, you can still ship to it.</p>
                    <div className="row">
                      <button type="button" className="btn-ghost" onClick={() => { setCheck(null); document.getElementById("addr1")?.focus(); }}>Edit address</button>
                      <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => placeOrder(address, false)}>Ship to it anyway</button>
                    </div>
                  </div>
                )}

                {fulfillment === "ship" && <fieldset>
                  <legend>Shipping</legend>
                  {(Object.keys(SHIPPING) as ShippingKey[]).map((k) => (
                    <label key={k} className="ship"><input type="radio" name="ship" checked={ship === k} onChange={() => setShip(k)} />
                      <span>{SHIPPING[k].label}<small>{SHIPPING[k].detail}</small></span><b>{money(SHIPPING[k].cents)}</b></label>
                  ))}
                </fieldset>}
                <div className="totals">
                  <div><span>{product.name} for {device.name}</span><span>{money(variant?.price_cents ?? 0)}</span></div>
                  <div><span>{fulfillment === "pickup" ? `Pickup${pickup ? ` at ${pickup.name}` : ""}` : `${SHIPPING[ship].label} shipping`}</span><span>{fulfillment === "pickup" ? "Free" : money(shipCents)}</span></div>
                  <div className="grand"><span>Total before tax</span><span>{money(total)}</span></div>
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn block" type="submit" disabled={!!busy || !!check}>{busy || `Pay ${money(total)} with Stripe`}</button>
                <p className="stripe-note">Secure card, Apple Pay and Google Pay checkout by Stripe. Sales tax is added at payment.</p>
              </form>
              <button className="btn-ghost" onClick={() => go(3)}>Back to design</button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
