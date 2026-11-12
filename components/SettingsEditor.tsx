"use client";
import { useState } from "react";
import { BUSINESS, SOCIALS, type Settings } from "@/lib/site";

export function SettingsEditor({ initial }: { initial: Settings }) {
  const [v, setV] = useState<Record<string, string>>({ ...initial } as Record<string, string>);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Saved. The website shows the changes right away." : j.error || "Save failed.");
    setBusy(false);
  }
  const field = (key: string, label: string, placeholder: string) => (
    <div className="field" key={key}><label htmlFor={`s-${key}`}>{label}</label>
      <input id={`s-${key}`} value={v[key] ?? ""} placeholder={placeholder} onChange={(e) => setV({ ...v, [key]: e.target.value })} /></div>
  );
  return (
    <form className="pane" onSubmit={save}>
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Social media</h2>
        <p className="note">Paste the full link to each profile. Empty ones are hidden on the site.</p>
        {SOCIALS.map((x) => field(x.key, x.label, x.placeholder))}
      </div>
      <div className="box">
        <h2 style={{ fontSize: 18 }}>Business details</h2>
        <p className="note">Shown on the Contact, Privacy Policy, Terms, Shipping and Returns pages.</p>
        {BUSINESS.map((x) => field(x.key, x.label, x.placeholder))}
      </div>
      {msg && <p className={msg.startsWith("Saved") ? "okmsg" : "error"}>{msg}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
