"use client";
import { useMemo, useState } from "react";
import { directionsUrl, fullAddress, miles, type Location } from "@/lib/locations";

type Origin = { lat: number; lng: number; label: string };

/**
 * List of machine locations, sorted by distance once the customer shares
 * their location or types a ZIP code. With `onSelect` it becomes a pickup picker.
 */
export function LocationFinder({ locations, selectedId, onSelect }: { locations: Location[]; selectedId?: string; onSelect?: (l: Location) => void }) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const list = useMemo(() => {
    const rows = locations.map((l) => ({ l, d: origin && l.lat != null && l.lng != null ? miles(origin, { lat: l.lat, lng: l.lng }) : null }));
    if (origin) rows.sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
    return rows;
  }, [locations, origin]);

  function useMine() {
    setErr("");
    if (!navigator.geolocation) { setErr("Your browser can't share your location. Type your ZIP code instead."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, label: "your location" }); setBusy(false); },
      () => { setErr("Location access was blocked. Type your ZIP code instead."); setBusy(false); },
      { timeout: 10000, maximumAge: 600000 },
    );
  }
  async function byZip() {
    setErr("");
    if (zip.trim().length < 3) { setErr("Enter a ZIP code or city."); return; }
    setBusy(true);
    const r = await fetch(`/api/locations/near?q=${encodeURIComponent(zip.trim())}`);
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok || j.lat == null) { setErr(j.error || "We couldn't find that place."); return; }
    setOrigin({ lat: j.lat, lng: j.lng, label: zip.trim() });
  }

  if (!locations.length) return <p className="note">Machine locations are coming soon.</p>;

  return (
    <div className="pane" style={{ gap: 12 }}>
      <div className="row" role="search">
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label htmlFor="near">Find the closest machine</label>
          <input id="near" placeholder="ZIP code or city" inputMode="text" value={zip} onChange={(e) => setZip(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); byZip(); } }} />
        </div>
        <button className="btn-ghost" type="button" disabled={busy} onClick={byZip} style={{ alignSelf: "end" }}>Search</button>
        <button className="btn-ghost" type="button" disabled={busy} onClick={useMine} style={{ alignSelf: "end" }}>Use my location</button>
      </div>
      {err && <p className="warn">{err}</p>}
      {origin && <p className="note">Closest to {origin.label} first.</p>}
      <ul className="locs">
        {list.map(({ l, d }) => {
          const picked = selectedId === l.id;
          const body = (
            <>
              <div className="loc-head">
                <strong>{l.name}</strong>
                {d != null && <span className="dist">{d < 10 ? d.toFixed(1) : Math.round(d)} mi</span>}
              </div>
              <span>{fullAddress(l)}</span>
              {l.hours && <span className="note">{l.hours}</span>}
              {l.note && <span className="note">{l.note}</span>}
              <div className="row" style={{ gap: 10 }}>
                {l.pickup && <span className="chip"><b>Pickup available</b></span>}
                {l.phone && <span className="note">{l.phone}</span>}
                <a href={directionsUrl(l)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Directions</a>
              </div>
            </>
          );
          return (
            <li key={l.id}>
              {onSelect
                ? <button type="button" className="loc" aria-pressed={picked} onClick={() => onSelect(l)}>{body}</button>
                : <div className="loc">{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
