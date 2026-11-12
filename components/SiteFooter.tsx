import Link from "next/link";
import { getSettings } from "@/lib/server/settings";
import { SOCIALS } from "@/lib/site";
import { SocialIcon } from "./SocialIcon";

export async function SiteFooter() {
  const s = await getSettings();
  const socials = SOCIALS.filter((x) => s[x.key]);
  return (
    <footer className="foot-site">
      <div className="wrap foot-in">
        <div className="pane" style={{ gap: 6 }}>
          <strong style={{ fontFamily: "var(--f-display)", fontSize: 17 }}>PrintPhoneCover</strong>
          <span className="note">Custom photo phone cases, printed in Texas and shipped across the US.</span>
          {socials.length > 0 && (
            <div className="socials" aria-label="Follow us">
              {socials.map((x) => (
                <a key={x.key} href={s[x.key]} target="_blank" rel="noopener noreferrer me" aria-label={`PrintPhoneCover on ${x.label}`} title={x.label}>
                  <SocialIcon name={x.key} />
                </a>
              ))}
            </div>
          )}
        </div>
        <nav className="foot-links" aria-label="Site">
          <Link href="/design">Design your case</Link>
          <Link href="/cases">Phone models</Link>
          <Link href="/locations">Find a machine</Link>
        </nav>
      </div>
      <div className="wrap" style={{ paddingBottom: 20 }}>
        <nav className="foot-legal" aria-label="Policies">
          <Link href="/contact">Contact</Link>
          <Link href="/shipping">Shipping &amp; Pickup</Link>
          <Link href="/returns">Returns &amp; Refunds</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <span className="note">© {new Date().getFullYear()} PrintPhoneCover</span>
        </nav>
      </div>
    </footer>
  );
}
