import Link from "next/link";
import { LegalPage, ContactLine } from "@/components/LegalPage";
import { getSettings } from "@/lib/server/settings";
import { SHIPPING, money } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shipping & Pickup – PrintPhoneCover", alternates: { canonical: "/shipping" } };

export default async function ShippingPolicy() {
  const s = await getSettings();
  return (
    <LegalPage title="Shipping & Pickup Policy">
      <h2>When we print</h2>
      <p>Each case is printed to order. Most orders are printed within 1–2 business days after payment.</p>

      <h2>Shipping</h2>
      <p>We ship to all 50 US states with USPS:</p>
      <ul>
        <li><b>{SHIPPING.standard.label}</b>: {SHIPPING.standard.detail}, {money(SHIPPING.standard.cents)}</li>
        <li><b>{SHIPPING.priority.label}</b>: {SHIPPING.priority.detail}, {money(SHIPPING.priority.cents)}</li>
      </ul>
      <p>Delivery times are USPS estimates after the package ships and aren&apos;t guaranteed. You get an email with your tracking number as soon as your case ships.</p>
      <p>We check your address with USPS at checkout. If you keep an address USPS can&apos;t confirm, we aren&apos;t responsible for delays or loss caused by an incorrect address. If your package is lost or tracking hasn&apos;t moved for 7 days, contact us within 30 days of shipping and we&apos;ll help.</p>

      <h2>Free pickup</h2>
      <p>You can choose to pick up your order free at one of our <Link href="/locations">machine locations</Link>. We email you when it&apos;s ready. Bring your order number. Pickup orders are held for 30 days.</p>

      <h2>Contact</h2>
      <ContactLine s={s} />
    </LegalPage>
  );
}
