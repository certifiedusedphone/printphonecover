import Link from "next/link";
import { Logo } from "./Logo";

export function AdminHeader({ active }: { active: "orders" | "catalog" | "locations" }) {
  return (
    <header className="top">
      <div className="wrap top-in">
        <Logo />
        <nav className="filters" aria-label="Admin">
          <Link href="/admin" aria-current={active === "orders" ? "page" : undefined}>Orders</Link>
          <Link href="/admin/catalog" aria-current={active === "catalog" ? "page" : undefined}>Catalog</Link>
          <Link href="/admin/locations" aria-current={active === "locations" ? "page" : undefined}>Locations</Link>
          <form action="/api/admin/logout" method="post"><button className="btn-ghost" style={{ padding: "5px 12px", borderRadius: 999 }}>Sign out</button></form>
        </nav>
      </div>
    </header>
  );
}
