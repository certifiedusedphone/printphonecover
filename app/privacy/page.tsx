import Link from "next/link";
import { LegalPage, ContactLine, biz } from "@/components/LegalPage";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy Policy – PrintPhoneCover", alternates: { canonical: "/privacy" } };

export default async function Privacy() {
  const s = await getSettings(); const b = biz(s);
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what {b.name} (&quot;we&quot;, &quot;us&quot;) collects when you use printphonecover.com or our phone case machines, how we use it, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Order details:</b> your name, email, phone number, shipping address or chosen pickup location, the phone model and case you pick, and what you paid.</li>
        <li><b>Your design:</b> the photos you upload, the text and stickers you add, and the print file we make from them.</li>
        <li><b>Payment:</b> Stripe processes your card, Apple Pay or Google Pay payment. We never see or store your full card number.</li>
        <li><b>Location searches:</b> if you type a ZIP code or city to find a machine, we send it to Google to find its map position. If you tap &quot;Use my location&quot;, your browser shares your position with the page only to sort machines by distance; we don&apos;t store it.</li>
        <li><b>Technical data:</b> our hosting provider keeps short-term server logs (such as IP address, browser type and pages requested) for security and troubleshooting.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To print your case, ship it or have it ready for pickup, and send you order and tracking emails.</li>
        <li>To check your shipping address with USPS so your package arrives.</li>
        <li>To answer your questions, handle reprints and refunds, and prevent fraud.</li>
        <li>To keep records required for taxes and accounting.</li>
      </ul>
      <p>We don&apos;t sell your personal information, we don&apos;t share it for targeted advertising, and we don&apos;t use your photos for anything other than your order unless you give us permission.</p>

      <h2>Who we share it with</h2>
      <p>Only with companies that help us run the store, and only what they need:</p>
      <ul>
        <li>Stripe (payments), Supabase (secure database and file storage), Cloudflare (website hosting)</li>
        <li>Google (address suggestions and map positions), EasyPost and USPS (address checks, labels and tracking)</li>
        <li>Our email provider (order emails)</li>
      </ul>
      <p>We may also share information if the law requires it, or to protect our rights or someone&apos;s safety. If you buy from us on Amazon or TikTok Shop, those marketplaces&apos; own privacy policies also apply.</p>

      <h2>Cookies</h2>
      <p>The store doesn&apos;t use advertising or tracking cookies. Stripe may use cookies on its checkout page for payment security.</p>

      <h2>How long we keep it</h2>
      <p>We keep order records for as long as we need them to fulfill your order, handle reprints and returns, and meet tax and legal requirements. You can ask us at any time to delete the photos and design files from your order.</p>

      <h2>Your rights</h2>
      <p>Depending on where you live, including under the Texas Data Privacy and Security Act, you can ask us to: confirm whether we have your personal data, give you a copy, correct it, or delete it. You can also opt out of the sale of personal data, targeted advertising and profiling, although we don&apos;t do any of those. To make a request, contact us using the details below. We&apos;ll answer within 45 days. If we turn down your request, you can appeal by replying to our answer, and we&apos;ll respond to the appeal within 60 days.</p>

      <h2>Children</h2>
      <p>Our store is not meant for children under 13, and we don&apos;t knowingly collect their personal information.</p>

      <h2>Security</h2>
      <p>Your data is sent over encrypted connections and stored with access limited to our staff. No system is perfectly secure, but we work to protect your information.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>

      <h2>Contact</h2>
      <ContactLine s={s} />
      <p>See also our <Link href="/terms">Terms of Service</Link>.</p>
    </LegalPage>
  );
}
