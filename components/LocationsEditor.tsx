"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fullAddress, type Location } from "@/lib/locations";

type Draft = Omit<Location, "id" | "lat" | "lng" | "line2" | "phone" | "hours" | "note"> & {
  id?: string; line2: string; phone: string; hours: string; note: string; lat: string; lng: string;
};
const empty: Draft = { name: "", line1: "", line2: "", city: "", state: "", zip: "", phone: "", hours: "", note: "", lat: "", lng: "", pickup: true, active: true, sort: 0 };
const toDraft = (l: Location): Draft => ({ ...l, line2: l.line2 ?? "", phone: l.phone ?? "", hours: l.hours ?? "", note: l.note ?? "", lat: l.lat?.toString() ?? "", lng: l.lng?.toString() ?? "" });

async function post(body: unknown) {
  const r = await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Save failed.");
  return j as { note?: string };
}

function Form({ initial, onDone }: { initial: Draft; onDone: (msg: string) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const f = (k: keyof Draft) => ({ id: `${k}-${initial.id ?? "new"}`, value: String(d[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value } as Draft) });
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      const j = await post({ action: "save", location: { ...d, state: d.state.toUpperCase(), lat: num(d.lat), lng: num(d.lng), sort: Number(d.sort) || 0 } });
      onDone(j.note || "Saved.");
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function del() {
    setBusy(true);
    try { await post({ action: "delete", id: d.id }); onDone("Deleted."); } catch (e) { setErr((e as Error).message); setBusy(false); }
  }
  return (
    <form className="pane" style={{ gap: 10 }} onSubmit={save}>
      <div className="two">
        <div className="field"><label htmlFor={`name-${initial.id ?? "new"}`}>Location name</label><input {...f("name")} placeholder="Mobile Spot – Timberland" required /></div>
        <div className="field"><label htmlFor={`phone-${initial.id ?? "new"}`}>Phone</label><input {...f("phone")} /></div>
      </div>
      <div className="field"><label htmlFor={`line1-${initial.id ?? "new"}`}>Street address</label><input {...f("line1")} required /></div>
      <div className="field"><label htmlFor={`line2-${initial.id ?? "new"}`}>Suite / unit (optional)</label><input {...f("line2")} /></div>
      <div className="three">
        <div className="field"><label htmlFor={`city-${initial.id ?? "new"}`}>City</label><input {...f("city")} required /></div>
        <div className="field"><label htmlFor={`state-${initial.id ?? "new"}`}>State</label><input {...f("state")} maxLength={2} placeholder="TX" required /></div>
        <div className="field"><label htmlFor={`zip-${initial.id ?? "new"}`}>ZIP</label><input {...f("zip")} maxLength={5} inputMode="numeric" required /></div>
      </div>
      <div className="field"><label htmlFor={`hours-${initial.id ?? "new"}`}>Hours</label><input {...f("hours")} placeholder="Mon–Sat 10am–8pm, Sun 12–6pm" /></div>
      <div className="field"><label htmlFor={`note-${initial.id ?? "new"}`}>Where to find the machine</label><input {...f("note")} placeholder="Inside the store, next to the register" /></div>
      <details>
        <summary className="note">Map position (filled in automatically from the address)</summary>
        <div className="two" style={{ marginTop: 8 }}>
          <div className="field"><label htmlFor={`lat-${initial.id ?? "new"}`}>Latitude</label><input {...f("lat")} inputMode="decimal" /></div>
          <div className="field"><label htmlFor={`lng-${initial.id ?? "new"}`}>Longitude</label><input {...f("lng")} inputMode="decimal" /></div>
        </div>
      </details>
      <div className="row">
        <label><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Show on website</label>
        <label><input type="checkbox" checked={d.pickup} onChange={(e) => setD({ ...d, pickup: e.target.checked })} /> Offer pickup here</label>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : initial.id ? "Save location" : "Add location"}</button>
        {initial.id && (confirmDel
          ? <><span className="note">Delete this location?</span><button type="button" className="mini danger" onClick={del}>Yes, delete</button><button type="button" className="mini" onClick={() => setConfirmDel(false)}>Keep</button></>
          : <button type="button" className="mini danger" onClick={() => setConfirmDel(true)}>Delete</button>)}
      </div>
    </form>
  );
}

export function LocationsEditor({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(locations.length ? null : "new");
  const [msg, setMsg] = useState("");
  const done = (m: string) => { setMsg(m); setOpen(null); router.refresh(); };
  return (
    <div className="pane">
      {msg && <p className={msg.startsWith("Saved, but") ? "warn" : "okmsg"}>{msg}</p>}
      <div className="box">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18 }}>{locations.length} location{locations.length === 1 ? "" : "s"}</h2>
          {open !== "new" && <button className="btn" onClick={() => setOpen("new")}>Add location</button>}
        </div>
        {open === "new" && <Form initial={empty} onDone={done} />}
      </div>
      {locations.map((l) => (
        <div className="box" key={l.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{l.name}</strong> {!l.active && <span className="status cancelled">Hidden</span>} {l.pickup && <span className="status shipped">Pickup</span>}
              <br /><span className="note">{fullAddress(l)}{l.lat == null ? " · no map position" : ""}</span>
            </div>
            <button className="mini" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? "Close" : "Edit"}</button>
          </div>
          {open === l.id && <Form initial={toDraft(l)} onDone={done} />}
        </div>
      ))}
    </div>
  );
}
