import Link from "next/link";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import type { Settings } from "@/lib/site";

export const EFFECTIVE = "November 11, 2026";

export function biz(s: Settings) {
  return {
    name: s.business_name || "PrintPhoneCover",
    email: s.contact_email || "",
    phone: s.contact_phone || "+1 832-566-8506",
    address: s.business_address || "6855 Harwin Dr. Suite M1, Houston, TX 77036",
  };
}

export function ContactLine({ s }: { s: Settings }) {
  const b = biz(s);
  return (
    <p>
      {b.name}, {b.address}. Phone {b.phone}
      {b.email ? <>, email <a href={`mailto:${b.email}`}>{b.email}</a></> : null}. You can also use our <Link href="/contact">contact page</Link>.
    </p>
  );
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn" href="/design">Design your case</Link></div></header>
      <main className="wrap page legal" style={{ maxWidth: 780 }}>
        <div className="pane-head"><h1 style={{ fontSize: 32 }}>{title}</h1><p>Effective {EFFECTIVE}</p></div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
