// Shipping options shown at checkout. Prices are charged to the customer;
// the label service is what the admin "Buy label" button purchases from USPS.
export const SHIPPING = {
  standard: { label: "Standard", detail: "USPS Ground Advantage · 3–5 business days", cents: 499, service: "GroundAdvantage" },
  priority: { label: "Priority", detail: "USPS Priority Mail · 1–3 business days", cents: 999, service: "Priority" },
} as const;
export type ShippingKey = keyof typeof SHIPPING;

export const money = (cents: number) => "$" + (cents / 100).toFixed(2);

export const STATUSES = ["pending", "paid", "printing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", paid: "Paid", printing: "Printing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export type Address = { name: string; line1: string; line2?: string; city: string; state: string; zip: string };
