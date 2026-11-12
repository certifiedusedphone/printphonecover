import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { getSettings } from "@/lib/server/settings";
import { SITE_URL, SOCIALS } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  const org = {
    "@context": "https://schema.org", "@type": "Organization", name: "PrintPhoneCover", url: SITE_URL, logo: `${SITE_URL}/og.png`,
    sameAs: SOCIALS.map((x) => s[x.key]).filter(Boolean),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <header className="top"><div className="wrap top-in"><Logo /><div className="row"><Link className="btn-ghost" href="/locations">Find a machine</Link><Link className="btn" href="/design">Design your case</Link></div></div></header>
      <main className="wrap">
        <section className="hero">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="eyebrow">Printed in the USA · Shipped nationwide</span>
            <h1>Your photo on your phone case, printed and shipped to your door.</h1>
            <p>Pick your phone, upload a photo, add text or stickers, and see exactly how it will look. We print it on the same machines as our in-store kiosks and ship it with USPS tracking.</p>
            <div className="row"><Link className="btn" href="/design">Start designing</Link><Link className="btn-ghost" href="/locations">Find a machine near you</Link><span className="note">Cases from $20</span></div>
          </div>
          <div className="box" style={{ alignItems: "center", background: "var(--bed)" }}>
            <img src="/hero-case.svg" alt="A custom printed phone case" width={260} height={420} />
          </div>
        </section>
        <section className="how" aria-label="How it works">
          <div className="box"><span className="eyebrow">1</span><h3>Choose your phone</h3><p>60 models: iPhone, Samsung Galaxy, Google Pixel and moto. <Link href="/cases">See all</Link>.</p></div>
          <div className="box"><span className="eyebrow">2</span><h3>Design it</h3><p>Upload a photo, then move, resize and rotate it until it looks right.</p></div>
          <div className="box"><span className="eyebrow">3</span><h3>Pay securely</h3><p>Card, Apple Pay or Google Pay through Stripe.</p></div>
          <div className="box"><span className="eyebrow">4</span><h3>Ship or pick up</h3><p>Ship it to your door with USPS tracking, or pick it up free at one of our machines.</p></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
