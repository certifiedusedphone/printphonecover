export type Location = {
  id: string; name: string; line1: string; line2: string | null; city: string; state: string; zip: string;
  phone: string | null; hours: string | null; note: string | null; lat: number | null; lng: number | null;
  pickup: boolean; active: boolean; sort: number;
};

/** Distance in miles between two points (great-circle). */
export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const fullAddress = (l: Pick<Location, "line1" | "line2" | "city" | "state" | "zip">) =>
  `${l.line1}${l.line2 ? `, ${l.line2}` : ""}, ${l.city}, ${l.state} ${l.zip}`;

export const directionsUrl = (l: Location) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.lat != null && l.lng != null ? `${l.lat},${l.lng}` : fullAddress(l))}`;
