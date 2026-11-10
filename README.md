# PrintPhoneCover.com

Online custom phone case store. Customers pick a phone and case, design it, pay with Stripe, and you print the case on your machine and ship it with USPS.

**Stack:** Next.js 14 (hosted on Cloudflare Workers via OpenNext) · Supabase (database + file storage) · Stripe Checkout · Google Places (address suggestions) · EasyPost (USPS address check, labels, tracking) · Resend (emails).

This is its own project. Use a **new** GitHub repo, a **new** Cloudflare Worker, a **new** Supabase project, and keys only for PrintPhoneCover. Do not reuse anything from other projects.

---

## How an order flows

1. **Customer** picks phone → case → designs it → enters email and address.
2. While typing the street, **Google suggests real addresses**; picking one fills city, state and ZIP.
3. On "Pay", the address is **checked against USPS** (EasyPost). If USPS has a corrected version, the customer sees it and chooses. If USPS can't find it, they're asked to fix it (or ship anyway — the admin then sees a warning).
4. The browser renders the **print file** (PNG, 300 dpi, exact print area, camera cutout transparent) and a preview, uploads both, and opens **Stripe Checkout**.
5. Stripe's webhook marks the order **Paid**, takes one case out of stock and emails the customer.
6. **Admin → Orders → Paid**: orders are grouped by phone model so you can batch-print. Open an order, download the print file, load it on the machine, click **Mark as Printing**.
7. Click **Buy USPS label & mark Shipped**: the label opens to print, the customer gets a tracking email.
8. EasyPost's tracking webhook marks it **Delivered** automatically and emails the customer.

Statuses: Pending → Paid → Printing → Shipped → Delivered (plus Cancelled).

---

## Setup (about an hour)

### 1. Supabase
1. Create a new project at supabase.com.
2. SQL Editor → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Project Settings → API: copy the URL, `anon` key and `service_role` key.

### 2. Stripe
1. Developers → API keys: copy the secret key (start with test mode).
2. Developers → Webhooks → add endpoint `https://printphonecover.com/api/stripe/webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy the signing secret.
3. Optional: turn on Stripe Tax, register where you collect sales tax, then set `STRIPE_AUTOMATIC_TAX=true`.

### 3. Google (address suggestions)
1. Google Cloud console → new project → enable **Places API (New)** → create an API key.
2. Restrict the key to Places API (New). It is used only on the server.
3. Google bills per use after its monthly free allowance; check current pricing in the Google Maps Platform console.

### 4. EasyPost (USPS check, labels, tracking)
1. Sign up at easypost.com, copy the API key (test key first), add a payment method for labels.
2. Webhooks → add `https://printphonecover.com/api/easypost/webhook?secret=YOUR_SECRET` (same secret as `EASYPOST_WEBHOOK_SECRET`).
3. Fill in the `SHIP_FROM_*` address and the parcel size in the environment variables.

### 5. Resend (emails)
1. Sign up at resend.com, verify the `printphonecover.com` domain (DNS records), create an API key.

### 6. GitHub + Cloudflare (auto-deploy)
1. GitHub: create a new **private, empty** repo named `printphonecover` (no README, no .gitignore).
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → connect GitHub → pick `printphonecover`.
   - Project name: `printphonecover` (must match `name` in `wrangler.jsonc`)
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx opennextjs-cloudflare deploy`
3. Worker → **Settings → Build → Variables and secrets**: add the three public values the build needs:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Worker → **Settings → Variables and Secrets** (runtime): add every variable from `.env.example`. Use **Secret** type for keys and passwords.
5. Worker → **Settings → Domains & Routes** → add `printphonecover.com` and `www.printphonecover.com` (the domain must be on Cloudflare DNS).
6. Every push to the `main` branch deploys automatically. Open `/admin` and sign in with `ADMIN_PASSWORD`.

Local development: `npm install`, copy `.env.example` to `.env.local`, `npm run dev`. To test in the Cloudflare runtime: `npm run preview`.

---

## Before going live

- **Calibrate outlines.** The iPhone 16 / 16 Pro / 16 Pro Max outlines are close approximations. For each model: place a test order, print it on the machine, compare edges and the camera cutout, then adjust the numbers in **Admin → Catalog → Print outline** and print again until it lines up.
- **Add more models** in Admin → Catalog → Add a phone model, then set prices, stock and tick For sale. Turn on a brand (Samsung, Google, Moto) once it has models.
- **Test the whole flow** in Stripe and EasyPost test mode, then switch both to live keys.
- **Refunds** are done in the Stripe dashboard; cancel the order in Admin too.

## Adding other products later

The catalog is built as *device (printable shape) × product (item type) = variant (price + stock)*. A new product type, for example a tumbler wrap, is a new device with its own print outline plus a product row. The editor, checkout, admin and print file work the same way.

## Files

- `components/Studio.tsx` – the customizer and checkout
- `lib/design/render.ts` – outlines, designs, stickers, print-file rendering
- `lib/design/editor.ts` – drag / resize / rotate editor
- `components/AddressFields.tsx` + `app/api/address/*` – Google suggestions and USPS check
- `app/api/orders/*`, `app/api/stripe/webhook` – order creation and payment
- `app/admin/*`, `app/api/admin/*` – dashboard, catalog, label buying
- `supabase/schema.sql`, `supabase/seed.sql` – database
