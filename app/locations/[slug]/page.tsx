import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { getLocations } from "@/lib/server/locations";
import { directionsUrl, fullAddress } from "@/lib/locations";
import { SITE_URL, slugify } from "@/lib/site";

export const dynamic = "force-dynamic";

async function find(slug: string) {
  return (await getLocations()).find((l) => slugify(l.name) === slug) ?? null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = await find((await props.params).slug);
  if (!l) return { title: "Machine location – PrintPhoneCover" };
  return {
    title: `Custom Phone Case Printing in ${l.city}, ${l.state} – ${l.name} | PrintPhoneCover`,
    description: `Print a custom photo phone case in minutes at ${l.note ? l.note + ", " : ""}${fullAddress(l)}. iPhone, Samsung Galaxy, Pixel and moto. ${l.hours ?? ""}`.trim(),
    alternates: { canonical: `/locations/${slugify(l.name)}` },
  };
}

export default async function LocationPage(props: { params: Promise<{ slug: string }> }) {
  const l = await find((await props.params).slug);
  if (!l) notFound();
  const soon = /coming soon/i.test(l.note ?? "");
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Store",
    name: `PrintPhoneCover – ${l.name}`,
    url: `${SITE_URL}/locations/${slugify(l.name)}`,
    telephone: l.phone ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: `${l.line1}${l.line2 ? `, ${l.line2}` : ""}`, addressLocality: l.city, addressRegion: l.state, postalCode: l.zip, addressCountry: "US" },
    ...(l.lat != null && l.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } } : {}),
    description: "Self-service custom phone case printing machine.",
  };
  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn" href="/design">Design online</Link></div></header>
      <main className="wrap page" style={{ maxWidth: 780 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/locations">Machine locations</Link><span>/</span><span>{l.city}</span></nav>
        <div className="pane-head">
          <span className="eyebrow">{soon ? "Coming soon" : "Phone case machine"}</span>
          <h1 style={{ fontSize: 32 }}>Custom phone case printing in {l.city}, {l.state}</h1>
          <p>{l.name}</p>
        </div>
        <div className="box">
          <dl className="specs-list">
            <dt>Address</dt><dd>{l.note && /^Inside /i.test(l.note) ? <>{l.note}<br /></> : null}{fullAddress(l)}</dd>
            {l.hours && (<><dt>Hours</dt><dd>{l.hours}</dd></>)}
            {l.phone && (<><dt>Phone</dt><dd><a href={`tel:${l.phone.replace(/[^+\d]/g, "")}`}>{l.phone}</a></dd></>)}
          </dl>
          <div className="row"><a className="btn" href={directionsUrl(l)} target="_blank" rel="noreferrer">Get directions</a><Link className="btn-ghost" href="/design">Design online instead</Link></div>
        </div>
        <section className="pane prose" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 22 }}>What you can do here</h2>
          <p>{soon ? "This machine is opening soon. " : ""}Walk up to the machine, pick your phone model, and print a case with a photo from your phone in a few minutes. You can also order online and {l.pickup ? "pick up your order here for free" : "have it shipped to you"}.</p>
          <p>We print cases for iPhone 11 through iPhone 18, Samsung Galaxy S and A series, Google Pixel 10 and moto g. <Link href="/cases">See all phone models</Link>.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
