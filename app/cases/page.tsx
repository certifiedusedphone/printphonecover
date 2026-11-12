import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { getCatalog } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Custom phone cases for iPhone, Samsung Galaxy, Google Pixel and moto – PrintPhoneCover",
  description: "Design a custom photo phone case for 60 phone models: iPhone 11 to iPhone 18, Galaxy S23 to S26, Galaxy A, Pixel 10 and moto g. Printed and shipped from Texas.",
  alternates: { canonical: "/cases" },
};

export default async function Cases() {
  const c = await getCatalog();
  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo /><Link className="btn" href="/design">Design your case</Link></div></header>
      <main className="wrap page" style={{ maxWidth: 960 }}>
        <div className="pane-head"><span className="eyebrow">Phone models</span><h1 style={{ fontSize: 32 }}>Custom photo cases for your phone</h1>
          <p>Pick your phone to see the cases we print for it and start designing.</p></div>
        {c.brands.filter((b) => b.active).map((b) => {
          const list = c.devices.filter((d) => d.brand_id === b.id);
          if (!list.length) return null;
          return (
            <section key={b.id} className="pane" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 22 }}>{b.name} cases</h2>
              <div className="model-links">{list.map((d) => <Link key={d.id} href={`/cases/${d.id}`}>{d.name} case</Link>)}</div>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
