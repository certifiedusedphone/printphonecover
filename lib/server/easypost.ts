import "server-only";
import type { Address } from "@/lib/shipping";

// EasyPost REST API: USPS address verification, labels and tracking.
const BASE = "https://api.easypost.com/v2";

async function ep<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) throw new Error("EASYPOST_API_KEY is not set.");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: "Basic " + btoa(key + ":"), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `EasyPost error (${res.status})`);
  return json as T;
}

type EpAddress = {
  id: string; name?: string; street1: string; street2?: string | null; city: string; state: string; zip: string;
  verifications?: { delivery?: { success: boolean; errors?: { message: string }[] } };
};

export type VerifyResult =
  | { ok: true; address: Address; changed: boolean }
  | { ok: false; message: string };

/** Checks the address against USPS data and returns the standardized version. */
export async function verifyAddress(a: Address): Promise<VerifyResult> {
  const r = await ep<EpAddress>("/addresses", {
    address: { name: a.name, street1: a.line1, street2: a.line2 || "", city: a.city, state: a.state, zip: a.zip, country: "US" },
    verify: true,
  });
  const d = r.verifications?.delivery;
  if (!d?.success) {
    const msg = d?.errors?.map((e) => e.message).join(" ") || "USPS could not confirm this address.";
    return { ok: false, message: msg };
  }
  const out: Address = {
    name: a.name, line1: r.street1, line2: r.street2 || "", city: r.city, state: r.state,
    zip: r.zip,
  };
  const norm = (s?: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const changed = norm(out.line1) !== norm(a.line1) || norm(out.line2) !== norm(a.line2) || norm(out.city) !== norm(a.city)
    || norm(out.state) !== norm(a.state) || norm(out.zip).slice(0, 5) !== norm(a.zip).slice(0, 5);
  return { ok: true, address: out, changed };
}

type Rate = { id: string; carrier: string; service: string; rate: string };
type Shipment = {
  id: string; rates: Rate[]; tracking_code?: string;
  postage_label?: { label_url: string }; tracker?: { public_url: string };
  selected_rate?: Rate;
};

export async function buyLabel(to: Address & { email?: string; phone?: string | null }, service: string) {
  const env = process.env;
  const shipment = await ep<Shipment>("/shipments", {
    shipment: {
      to_address: { name: to.name, street1: to.line1, street2: to.line2 || "", city: to.city, state: to.state, zip: to.zip, country: "US", email: to.email, phone: to.phone || undefined },
      from_address: {
        name: env.SHIP_FROM_NAME, street1: env.SHIP_FROM_STREET1, street2: env.SHIP_FROM_STREET2 || "",
        city: env.SHIP_FROM_CITY, state: env.SHIP_FROM_STATE, zip: env.SHIP_FROM_ZIP, country: "US", phone: env.SHIP_FROM_PHONE,
      },
      parcel: {
        length: Number(env.PARCEL_LENGTH || 8), width: Number(env.PARCEL_WIDTH || 5),
        height: Number(env.PARCEL_HEIGHT || 1.5), weight: Number(env.PARCEL_WEIGHT_OZ || 5),
      },
    },
  });
  const usps = shipment.rates.filter((r) => r.carrier === "USPS");
  const rate = usps.find((r) => r.service === service) ?? usps.sort((a, b) => Number(a.rate) - Number(b.rate))[0];
  if (!rate) throw new Error("No USPS rate was returned for this address.");
  const bought = await ep<Shipment>(`/shipments/${shipment.id}/buy`, { rate: { id: rate.id } });
  return {
    shipmentId: bought.id,
    carrier: "USPS",
    service: rate.service,
    costCents: Math.round(Number(rate.rate) * 100),
    trackingCode: bought.tracking_code ?? "",
    trackingUrl: bought.tracker?.public_url ?? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${bought.tracking_code}`,
    labelUrl: bought.postage_label?.label_url ?? "",
  };
}
