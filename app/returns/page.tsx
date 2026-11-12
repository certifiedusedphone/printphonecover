import Link from "next/link";
import { LegalPage, ContactLine } from "@/components/LegalPage";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Returns & Refunds – PrintPhoneCover", alternates: { canonical: "/returns" } };

export default async function Returns() {
  const s = await getSettings();
  return (
    <LegalPage title="Returns & Refunds Policy">
      <p>Every case is made just for you with your own design, so we can&apos;t accept returns if you change your mind. We&apos;ll always make it right if something is wrong on our side.</p>

      <h2>Damaged, defective or wrong</h2>
      <p>If your case arrives damaged, has a print defect, or isn&apos;t the phone model or design you ordered, contact us within 30 days of delivery or pickup. Include your order number and a photo. We&apos;ll reprint it for free or refund you, and you don&apos;t need to send the case back unless we ask.</p>

      <h2>Not covered</h2>
      <ul>
        <li>Choosing the wrong phone model at checkout</li>
        <li>Low-resolution or blurry photos you uploaded, or spelling mistakes in your text</li>
        <li>Small color differences between your screen and the print</li>
        <li>Normal wear after use</li>
      </ul>

      <h2>Cancellations</h2>
      <p>You can cancel for a full refund until we start printing. Contact us as soon as possible with your order number. Once printing has started, the order can&apos;t be cancelled.</p>

      <h2>Refunds</h2>
      <p>Refunds go back to your original payment method. Banks usually show them within 5–10 business days.</p>

      <h2>Marketplace orders</h2>
      <p>For orders placed on Amazon or TikTok Shop, start your request through that marketplace.</p>

      <h2>Contact</h2>
      <ContactLine s={s} />
      <p>See also our <Link href="/shipping">Shipping &amp; Pickup Policy</Link>.</p>
    </LegalPage>
  );
}
