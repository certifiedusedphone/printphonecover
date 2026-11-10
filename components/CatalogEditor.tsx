"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Geometry } from "@/lib/design/render";
import { CaseThumb } from "./CaseThumb";

type V = { id: string; product_id: string; price_cents: number; stock: number; active: boolean };
type D = { id: string; brand_id: string; name: string; geometry: Geometry; active: boolean; variants: V[] };
type P = { id: string; code: string; name: string };
type B = { id: string; name: string; active: boolean };

const plain = (c: CanvasRenderingContext2D, W: number, H: number) => { c.fillStyle = "#F2EFF4"; c.fillRect(0, 0, W, H); };

async function post(body: unknown) {
  const r = await fetch("/api/admin/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Save failed.");
}

function VariantRow({ v, product }: { v: V; product: P }) {
  const [price, setPrice] = useState((v.price_cents / 100).toFixed(2));
  const [stock, setStock] = useState(String(v.stock));
  const [active, setActive] = useState(v.active);
  const [msg, setMsg] = useState("");
  async function save() {
    setMsg("");
    try { await post({ action: "update_variant", id: v.id, price_cents: Math.round(Number(price) * 100), stock: Number(stock), active }); setMsg("Saved"); }
    catch (e) { setMsg((e as Error).message); }
  }
  return (
    <tr>
      <td>{product.code} {product.name}</td>
      <td className="num"><input aria-label="Price" style={{ width: 80 }} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></td>
      <td className="num"><input aria-label="Stock" style={{ width: 70 }} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></td>
      <td><label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> For sale</label></td>
      <td><button className="mini" onClick={save}>Save</button> <span className="note">{msg}</span></td>
    </tr>
  );
}

function DeviceCard({ d, products }: { d: D; products: P[] }) {
  const router = useRouter();
  const [name, setName] = useState(d.name);
  const [json, setJson] = useState(JSON.stringify(d.geometry, null, 1));
  const [active, setActive] = useState(d.active);
  const [msg, setMsg] = useState("");
  let geo: Geometry | null = null;
  try { geo = JSON.parse(json); } catch { geo = null; }
  async function save() {
    setMsg("");
    if (!geo) { setMsg("The outline isn't valid JSON."); return; }
    try { await post({ action: "update_device", id: d.id, name, geometry: geo, active }); setMsg("Saved"); router.refresh(); }
    catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div className="box">
      <div className="split" style={{ gridTemplateColumns: "minmax(0,120px) minmax(0,1fr)" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>{geo && geo.cam ? <CaseThumb geometry={geo} finish="solid" content={plain} width={100} height={170} /> : <span className="error">Invalid outline</span>}</div>
        <div className="pane" style={{ gap: 10 }}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label htmlFor={`n-${d.id}`}>Name</label><input id={`n-${d.id}`} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <label style={{ alignSelf: "end", paddingBottom: 10 }}><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Show on site</label>
          </div>
          <details>
            <summary className="note">Print outline (millimetres) · adjust after a test print</summary>
            <textarea aria-label="Outline JSON" value={json} onChange={(e) => setJson(e.target.value)} />
            <p className="note">w, h = print area; r = corner radius; cam = camera cutout (x, y, w, h, r); lenses = [x, y, radius] inside the cutout, for the preview only.</p>
          </details>
          <div className="row"><button className="mini" onClick={save}>Save phone</button><span className="note">{msg}</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Case</th><th className="num">Price $</th><th className="num">Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>{d.variants.map((v) => <VariantRow key={v.id} v={v} product={products.find((p) => p.id === v.product_id)!} />)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const TEMPLATE = { w: 74, h: 151, r: 11.5, cam: { x: 3.2, y: 3.2, w: 38.5, h: 38.5, r: 9.5, lenses: [[11, 11, 7.2], [11, 27.5, 7.2], [27, 19.25, 7.2]] } };

export function CatalogEditor({ brands, devices, products }: { brands: B[]; devices: D[]; products: P[] }) {
  const router = useRouter();
  const [nid, setNid] = useState(""); const [nname, setNname] = useState(""); const [nbrand, setNbrand] = useState(brands[0]?.id ?? "");
  const [njson, setNjson] = useState(JSON.stringify(TEMPLATE, null, 1));
  const [msg, setMsg] = useState("");
  async function add() {
    setMsg("");
    try { await post({ action: "add_device", id: nid.trim(), brand_id: nbrand, name: nname.trim(), geometry: JSON.parse(njson) }); setNid(""); setNname(""); setMsg("Added. Set prices and stock, then tick For sale."); router.refresh(); }
    catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div className="pane">
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Brands shown on the site</h2>
        <div className="row">
          {brands.map((b) => (
            <label key={b.id} className="chip" style={{ padding: "6px 12px" }}>
              <input type="checkbox" defaultChecked={b.active} onChange={async (e) => { await post({ action: "toggle_brand", id: b.id, active: e.target.checked }); router.refresh(); }} /> {b.name}
            </label>
          ))}
        </div>
      </div>
      {brands.map((b) => {
        const list = devices.filter((d) => d.brand_id === b.id);
        if (!list.length) return null;
        return (
          <section key={b.id} className="pane">
            <h2 style={{ fontSize: 20 }}>{b.name}</h2>
            {list.map((d) => <DeviceCard key={d.id} d={d} products={products} />)}
          </section>
        );
      })}
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Add a phone model</h2>
        <div className="three">
          <div className="field"><label htmlFor="nname">Name</label><input id="nname" placeholder="Galaxy S25 Ultra" value={nname} onChange={(e) => setNname(e.target.value)} /></div>
          <div className="field"><label htmlFor="nid">ID</label><input id="nid" placeholder="s25ultra" value={nid} onChange={(e) => setNid(e.target.value)} /></div>
          <div className="field"><label htmlFor="nbrand">Brand</label><select id="nbrand" value={nbrand} onChange={(e) => setNbrand(e.target.value)}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        </div>
        <textarea aria-label="Outline JSON for the new phone" value={njson} onChange={(e) => setNjson(e.target.value)} />
        <div className="row"><button className="btn" onClick={add} disabled={!nid || !nname}>Add phone</button><span className="note">{msg}</span></div>
      </div>
    </div>
  );
}
