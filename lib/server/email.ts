import "server-only";
import { money } from "@/lib/shipping";

// Order emails through Resend. If RESEND_API_KEY is missing, emails are skipped (logged).
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) { console.warn("Email skipped (Resend not configured):", subject); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("Email failed", res.status, await res.text());
}

type O = { id: string; number: string; token: string; email: string; ship_name: string; device_name: string; product_name: string; total_cents: number; tracking_url?: string | null; tracking_code?: string | null };

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "https://printphonecover.com";
const link = (o: O) => `${site()}/order/${o.id}?t=${o.token}`;
const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#17141C;line-height:1.5">
<p style="font-weight:bold;font-size:18px">PrintPhoneCover</p>${body}
<p style="color:#675F70;font-size:13px">Questions? Just reply to this email.</p></div>`;

export const emails = {
  paid: (o: O) => send(o.email, `Order ${o.number} confirmed`, wrap(
    `<p>Hi ${o.ship_name.split(" ")[0]}, thanks for your order!</p>
     <p><b>${o.product_name}</b> for ${o.device_name}<br>Total: ${money(o.total_cents)}</p>
     <p>We print your case and send you another email with tracking when it ships.</p>
     <p><a href="${link(o)}">View your order</a></p>`)),
  shipped: (o: O) => send(o.email, `Order ${o.number} has shipped`, wrap(
    `<p>Your custom case is on its way.</p>
     <p>USPS tracking: <a href="${o.tracking_url}">${o.tracking_code}</a></p>
     <p><a href="${link(o)}">View your order</a></p>`)),
  delivered: (o: O) => send(o.email, `Order ${o.number} was delivered`, wrap(
    `<p>USPS shows your package as delivered. Enjoy your new case!</p>
     <p><a href="${link(o)}">View your order</a></p>`)),
};
