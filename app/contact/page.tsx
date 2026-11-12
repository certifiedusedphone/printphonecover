import Link from "next/link";
import { LegalPage, biz } from "@/components/LegalPage";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact – PrintPhoneCover", alternates: { canonical: "/contact" } };

export default async function Contact() {
  const s = await getSettings(); const b = biz(s);
  return (
    <LegalPage title="Contact us">
      <p>Questions about an order, a reprint or a machine? We&apos;re happy to help. Have your order number ready if you have one.</p>
      <dl className="specs-list">
        <dt>Business</dt><dd>{b.name}</dd>
        <dt>Phone</dt><dd><a href={`tel:${b.phone.replace(/[^+\d]/g, "")}`}>{b.phone}</a></dd>
        {b.email && (<><dt>Email</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd></>)}
        <dt>Address</dt><dd>{b.address}</dd>
      </dl>
      <p>Prefer to print right now? <Link href="/locations">Find a machine near you</Link>.</p>
    </LegalPage>
  );
}
