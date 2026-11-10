import "server-only";
import { db } from "./db";
import { emails } from "./email";
import type { OrderStatus } from "@/lib/shipping";

const stampColumn: Partial<Record<OrderStatus, string>> = {
  paid: "paid_at", printing: "printing_at", shipped: "shipped_at", delivered: "delivered_at",
};

/** Moves an order to a new status, records the event and sends the matching email. */
export async function setStatus(orderId: string, status: OrderStatus, extra: Record<string, unknown> = {}, note?: string) {
  const patch: Record<string, unknown> = { status, ...extra };
  const col = stampColumn[status]; if (col) patch[col] = new Date().toISOString();
  const { data: order, error } = await db().from("orders").update(patch).eq("id", orderId).select("*").single();
  if (error) throw error;
  await db().from("order_events").insert({ order_id: orderId, status, note: note ?? null });
  try {
    if (status === "paid") await emails.paid(order);
    if (status === "shipped") await emails.shipped(order);
    if (status === "delivered") await emails.delivered(order);
  } catch (e) { console.error("email error", e); }
  return order;
}

export function newOrderNumber() {
  const d = new Date();
  const ymd = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0");
  return `PPC-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function newToken() {
  const b = new Uint8Array(18); crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
