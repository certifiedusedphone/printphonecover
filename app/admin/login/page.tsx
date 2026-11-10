"use client";
import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = "/admin";
    else { setErr("Wrong password."); setBusy(false); }
  }
  return (
    <main className="wrap page" style={{ maxWidth: 420 }}>
      <Logo />
      <form className="box" onSubmit={submit}>
        <h1 style={{ fontSize: 24 }}>Admin sign in</h1>
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
