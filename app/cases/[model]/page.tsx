import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { ModelPreview } from "@/components/ModelPreview";
import { getCatalog } from "@/lib/server/catalog";
import { money } from "@/lib/shipping";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const c = await getCatalog();
  const device = c.devices.find((d) => d.id === id);
  if (!device) return null;
  const brand = c.brands.find((b) => b.id === device.brand_id);
  const options = c.variants.filter((v) => v.device_id === id).map((v) => ({ v, p: c.products.find((p) => p.id === v.product_id)! })).filter((x) => x.p);
  const related = c.devices.filter((d) => d.brand_id === device.brand_id && d.id !== id && d.series === device.series).slice(0, 12);
  return { device, brand, options, related };
}

export async function generateMetadata(props: { params: Promise<{ model: string }> }): Promise<Metadata> {
  const { model } = await props.params;
  const x = await load(model);
  if (!x) return { title: "Phone case – PrintPhoneCover" };
  const low = Math.min(...x.options.map((o) => o.v.price_cents));
  return {
    title: `Custom ${x.device.name} Case with Your Photo – PrintPhoneCover`,
    description: `Design your own ${x.device.name} case online: upload a photo, add text, see a live preview. From ${money(low)}, printed in Texas and shipped across the US, or picked up free at our machines.`,
    alternates: { canonical: `/cases/${model}` },
    openGraph: { title: `Custom ${x.device.name} case with your photo`, url: `/cases/${model}` },
  };
}

export default async function ModelPage(props: { params: Promise<{ model: string }> }) {
  const { model } = await props.params;
  const x = await load(model);
  if (!x || !x.options.length) notFound();
  const { device, brand, options, related } = x;
  const prices = options.map((o) => o.v.price_cents / 100);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product",
    name: `Custom ${device.name} photo case`,
    brand: { "@type": "Brand", name: "PrintPhoneCover" },
    description: `Custom printed ${device.name} case with your own photo or design.`,
    url: `${SITE_URL}/cases/${device.id}`,
    offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: options.length, availability: "https://schema.org/InStock" },
  };
  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn" href={`/design?model=${device.id}`}>Design yours</Link></div></header>
      <main className="wrap page" style={{ maxWidth: 960 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/cases">Phone models</Link><span>/</span><span>{brand?.name}</span><span>/</span><span>{device.name}</span></nav>
        <section className="model-hero">
          <div className="box" style={{ alignItems: "center", background: "var(--bed)" }}><ModelPreview mask={options[0].v.mask} finish={options[0].p.finish} /></div>
          <div className="pane" style={{ gap: 14 }}>
            <h1 style={{ fontSize: "clamp(28px,4vw,42px)" }}>Custom {device.name} case with your photo</h1>
            <p className="note" style={{ fontSize: 16 }}>Upload a photo, add text or stickers, and see exactly how your {device.name} case will look before you order. We print it on the same machines as our in-store kiosks, cut out precisely for the {device.name} camera.</p>
            <div className="row"><Link className="btn" href={`/design?model=${device.id}`}>Design your {device.name} case</Link><Link className="btn-ghost" href="/locations">Print in person</Link></div>
          </div>
        </section>
        <section className="pane" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 22 }}>Case options for {device.name}</h2>
          {options.map(({ v, p }) => (
            <div key={v.id} className="case" style={{ cursor: "default" }}>
              <ModelPreview mask={v.mask} finish={p.finish} width={76} height={130} />
              <div><h3>{p.name}<span className="code">{p.code}</span></h3><p>{p.description}</p><span className="price">{money(v.price_cents)}</span></div>
            </div>
          ))}
        </section>
        <section className="pane prose" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 22 }}>How it works</h2>
          <p>1. Choose {device.name} and your case style. 2. Upload a photo and position it on the case. 3. Pay securely with card, Apple Pay or Google Pay. 4. We print it within 1–2 business days and ship it with USPS tracking, or have it ready for free pickup at one of our Texas machine locations.</p>
        </section>
        {related.length > 0 && (
          <section className="pane" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Other {brand?.name} cases</h2>
            <div className="model-links">{related.map((d) => <Link key={d.id} href={`/cases/${d.id}`}>{d.name} case</Link>)}</div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
