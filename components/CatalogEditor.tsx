"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type V = { id: string; product_id: string; price_cents: number; stock: number; active: boolean; mask_src: string | null; mask_url: string | null; mask_w: number | null; mask_h: number | null };
type D = { id: string; brand_id: string; name: string; series: string | null; active: boolean; variants: V[] };
type P = { id: string; code: string; name: string };
type B = { id: string; name: string; active: boolean };

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Save failed.");
  return j;
}

function VariantRow({ d, v, product, first }: { d: D; v: V; product: P; first: boolean }) {
  const [price, setPrice] = useState((v.price_cents / 100).toFixed(2));
  const [stock, setStock] = useState(String(v.stock));
  const [active, setActive] = useState(v.active);
  const [mask, setMask] = useState(v.mask_src ?? "");
  const [edit, setEdit] = useState(false);
  const [msg, setMsg] = useState("");
  const shown = v.mask_url || v.mask_src;
  async function save() {
    setMsg("");
    try {
      await post("/api/admin/variants", { action: "update_variant", id: v.id, price_cents: Math.round(Number(price) * 100), stock: Number(stock), active, mask_src: mask.trim() });
      setMsg("Saved");
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <tr>
      <td>{first ? <b>{d.name}</b> : ""}</td>
      <td>{product.code}</td>
      <td>{shown ? <a href={shown} target="_blank" rel="noreferrer" title={v.mask_w ? `${v.mask_w} × ${v.mask_h} px` : "Open mask"}><img src={shown} alt={`${d.name} ${product.code} mask`} className="checker" /></a> : <span className="note">No mask</span>}
        <br /><span className="note">{v.mask_url ? "Our copy" : "Machine link"}</span>
        {edit ? <input aria-label="Mask PNG link" value={mask} onChange={(e) => setMask(e.target.value)} style={{ width: 220, display: "block" }} /> : <button className="mini" onClick={() => setEdit(true)} style={{ display: "block", marginTop: 4 }}>Change</button>}
      </td>
      <td className="num"><input aria-label="Price" style={{ width: 72 }} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></td>
      <td className="num"><input aria-label="Stock" style={{ width: 60 }} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></td>
      <td><label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> For sale</label></td>
      <td><button className="mini" onClick={save}>Save</button> <span className="note">{msg}</span></td>
    </tr>
  );
}

function CopyMasks({ missing }: { missing: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(missing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setBusy(true); setMsg("");
    let remaining = left, failed: string[] = [];
    try {
      for (let i = 0; i < 40 && remaining > 0; i++) {
        const j = await post("/api/admin/masks");
        failed = failed.concat(j.failed);
        if (j.remaining >= remaining && j.copied === 0) break; // nothing more can be copied
        remaining = j.remaining; setLeft(remaining);
      }
      setMsg(remaining === 0 ? "All masks copied." : `${remaining} could not be copied.${failed.length ? " " + failed.slice(0, 3).join("; ") : ""}`);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="box">
      <h2 style={{ fontSize: 18 }}>Case masks</h2>
      <p className="note">The website uses the vending machine&apos;s own mask images, so the preview and print file match the machine. Copy them into your own storage so the site keeps working even if the machine&apos;s links change.</p>
      <div className="row">
        <button className="btn" onClick={run} disabled={busy || left === 0}>{busy ? `Copying… ${left} left` : left === 0 ? "All masks copied" : `Copy ${left} masks to our storage`}</button>
        <span className="note">{msg}</span>
      </div>
    </div>
  );
}

export function CatalogEditor({ brands, devices, products }: { brands: B[]; devices: D[]; products: P[] }) {
  const router = useRouter();
  const [nid, setNid] = useState(""); const [nname, setNname] = useState(""); const [nbrand, setNbrand] = useState(brands[0]?.id ?? "");
  const [nseries, setNseries] = useState("");
  const [nmasks, setNmasks] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const missing = devices.reduce((n, d) => n + d.variants.filter((v) => v.mask_src && !v.mask_url).length, 0);
  async function add() {
    setMsg("");
    try {
      await post("/api/admin/variants", { action: "add_device", id: nid.trim(), brand_id: nbrand, name: nname.trim(), series: nseries.trim(), masks: nmasks });
      setNid(""); setNname(""); setNmasks({}); setMsg("Added. Set prices and stock, then tick For sale."); router.refresh();
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div className="pane">
      <CopyMasks missing={missing} />
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Brands shown on the site</h2>
        <div className="row">
          {brands.map((b) => (
            <label key={b.id} className="chip" style={{ padding: "6px 12px" }}>
              <input type="checkbox" defaultChecked={b.active} onChange={async (e) => { await post("/api/admin/variants", { action: "toggle_brand", id: b.id, active: e.target.checked }); router.refresh(); }} /> {b.name}
            </label>
          ))}
        </div>
      </div>
      {brands.map((b) => {
        const list = devices.filter((d) => d.brand_id === b.id);
        if (!list.length) return null;
        return (
          <section key={b.id} className="box">
            <h2 style={{ fontSize: 20 }}>{b.name} <span className="note">{list.length} models</span></h2>
            <div className="table-wrap">
              <table className="catalog">
                <thead><tr><th>Phone</th><th>Case</th><th>Mask</th><th className="num">Price $</th><th className="num">Stock</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {list.flatMap((d) => d.variants.map((v, i) => (
                    <VariantRow key={v.id} d={d} v={v} first={i === 0} product={products.find((p) => p.id === v.product_id) ?? { id: v.product_id, code: v.product_id, name: v.product_id }} />
                  )))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Add a phone model</h2>
        <p className="note">When the machine adds a new model, paste its mask PNG link for each case type.</p>
        <div className="two">
          <div className="field"><label htmlFor="nname">Name</label><input id="nname" placeholder="Galaxy S27 Ultra" value={nname} onChange={(e) => setNname(e.target.value)} /></div>
          <div className="field"><label htmlFor="nid">ID</label><input id="nid" placeholder="galaxy-s27-ultra" value={nid} onChange={(e) => setNid(e.target.value)} /></div>
          <div className="field"><label htmlFor="nbrand">Brand</label><select id="nbrand" value={nbrand} onChange={(e) => setNbrand(e.target.value)}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label htmlFor="nseries">Series</label><input id="nseries" placeholder="Galaxy S" value={nseries} onChange={(e) => setNseries(e.target.value)} /></div>
        </div>
        {products.map((p) => (
          <div key={p.id} className="field"><label htmlFor={`nm-${p.id}`}>{p.code} {p.name} mask link (leave empty if not offered)</label>
            <input id={`nm-${p.id}`} placeholder="https://…png" value={nmasks[p.id] ?? ""} onChange={(e) => setNmasks({ ...nmasks, [p.id]: e.target.value.trim() })} /></div>
        ))}
        <div className="row"><button className="btn" onClick={add} disabled={!nid || !nname}>Add phone</button><span className="note">{msg}</span></div>
      </div>
    </div>
  );
}
