"use client";
import { useEffect, useRef, useState } from "react";
import type { Address } from "@/lib/shipping";

type Suggestion = { placeId: string; main: string; secondary: string };

const newSession = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

/**
 * Shipping address with Google address suggestions on the street field.
 * Picking a suggestion fills street, city, state and ZIP.
 */
export function AddressFields({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const [list, setList] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef(newSession());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNext = useRef(false);

  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; }
    const q = value.line1.trim();
    clearTimeout(timer.current);
    if (q.length < 3) { setList([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(q)}&session=${session.current}`);
        const j = await r.json();
        setList(j.suggestions ?? []); setActive(-1); setOpen(true);
      } catch { setList([]); }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [value.line1]);

  async function pick(s: Suggestion) {
    setOpen(false); setList([]);
    try {
      const r = await fetch(`/api/address/details?id=${encodeURIComponent(s.placeId)}&session=${session.current}`);
      const j = await r.json();
      if (j.address) {
        skipNext.current = true;
        onChange({ ...value, line1: j.address.line1 || s.main, line2: j.address.line2 || value.line2, city: j.address.city, state: j.address.state, zip: j.address.zip });
      }
    } finally { session.current = newSession(); }
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !list.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(list[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <>
      <div className="field"><label htmlFor="fullname">Full name</label>
        <input id="fullname" required autoComplete="name" value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="field">
        <label htmlFor="addr1">Street address</label>
        <input id="addr1" required autoComplete="off" placeholder="Start typing your address" value={value.line1}
          role="combobox" aria-expanded={open && list.length > 0} aria-controls="addr-suggest" aria-autocomplete="list"
          onChange={(e) => set({ line1: e.target.value })} onKeyDown={onKey}
          onFocus={() => list.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {open && list.length > 0 && (
          <ul className="suggest" id="addr-suggest" role="listbox">
            {list.map((s, i) => (
              <li key={s.placeId}>
                <button type="button" role="option" aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                  {s.main}<small>{s.secondary}</small>
                </button>
              </li>
            ))}
            <li className="powered">Address suggestions by Google</li>
          </ul>
        )}
      </div>
      <div className="field"><label htmlFor="addr2">Apt, suite, unit (optional)</label>
        <input id="addr2" autoComplete="address-line2" value={value.line2 ?? ""} onChange={(e) => set({ line2: e.target.value })} /></div>
      <div className="three">
        <div className="field"><label htmlFor="city">City</label>
          <input id="city" required autoComplete="address-level2" value={value.city} onChange={(e) => set({ city: e.target.value })} /></div>
        <div className="field"><label htmlFor="state">State</label>
          <input id="state" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" autoComplete="address-level1"
            value={value.state} onChange={(e) => set({ state: e.target.value.toUpperCase() })} /></div>
        <div className="field"><label htmlFor="zip">ZIP</label>
          <input id="zip" required inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} autoComplete="postal-code"
            value={value.zip} onChange={(e) => set({ zip: e.target.value.replace(/[^0-9-]/g, "") })} /></div>
      </div>
    </>
  );
}
