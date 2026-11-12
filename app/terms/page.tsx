import Link from "next/link";
import { LegalPage, ContactLine, biz } from "@/components/LegalPage";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of Service – PrintPhoneCover", alternates: { canonical: "/terms" } };

export default async function Terms() {
  const s = await getSettings(); const b = biz(s);
  return (
    <LegalPage title="Terms of Service">
      <p>These terms apply when you use printphonecover.com or buy a custom phone case from {b.name} (&quot;we&quot;, &quot;us&quot;). By placing an order you agree to them.</p>

      <h2>Orders and prices</h2>
      <ul>
        <li>Prices are in US dollars and shown before checkout. Sales tax is added at payment where required.</li>
        <li>Payment is taken by Stripe when you place your order. Your order is confirmed once payment goes through.</li>
        <li>We may cancel and fully refund an order if the case is out of stock, the design breaks the rules below, or there was a clear pricing error.</li>
      </ul>

      <h2>Your photos and designs</h2>
      <ul>
        <li>You confirm that you own the photos and content you upload, or have permission to use them, and that printing them doesn&apos;t break anyone&apos;s rights.</li>
        <li>You give us permission to store, edit for printing, and print your design only to make and deliver your order.</li>
        <li>We won&apos;t print content that is illegal, sexually explicit, hateful, threatening, or that uses other people&apos;s trademarks, logos, characters, artwork or photos without permission. If an order breaks these rules we cancel it and refund you.</li>
        <li>You are responsible for choosing the correct phone model and checking your design, spelling and photo placement before ordering.</li>
      </ul>

      <h2>Print results</h2>
      <p>The on-screen preview shows your design on the case outline we print with. Printed colors can look slightly different from your screen, and very small or low-resolution photos may print less sharp. The site warns you when a photo may print blurry.</p>

      <h2>Shipping, pickup and returns</h2>
      <p>See our <Link href="/shipping">Shipping &amp; Pickup Policy</Link> and <Link href="/returns">Returns &amp; Refunds Policy</Link>. Pickup orders are held for 30 days; after that we may cancel the order without a refund of the case price.</p>

      <h2>Marketplace orders</h2>
      <p>If you buy from us on Amazon or TikTok Shop, that marketplace&apos;s terms and return rules apply to your purchase.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent the law allows, our total liability for any order is limited to the amount you paid for it, and we are not responsible for indirect or consequential losses. Phone cases help protect against everyday wear but we don&apos;t guarantee they prevent damage to your phone. Nothing in these terms limits rights you have under consumer protection laws that can&apos;t be waived.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Texas, United States.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The version in effect when you place your order applies to that order.</p>

      <h2>Contact</h2>
      <ContactLine s={s} />
      <p>See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </LegalPage>
  );
}
