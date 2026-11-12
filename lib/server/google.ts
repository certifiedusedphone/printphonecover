import "server-only";

// Google Places API (New). The key stays on the server.
const KEY = () => {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not set.");
  return k;
};

export type Suggestion = { placeId: string; main: string; secondary: string };

export async function autocomplete(input: string, sessionToken: string): Promise<Suggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY(),
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["us"],
      includedPrimaryTypes: ["street_address", "premise", "subpremise"],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places autocomplete failed (${res.status})`);
  const json = await res.json();
  type P = { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } };
  return ((json.suggestions ?? []) as P[])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      main: s.placePrediction!.structuredFormat?.mainText?.text ?? "",
      secondary: s.placePrediction!.structuredFormat?.secondaryText?.text ?? "",
    }));
}

export type PlaceAddress = { line1: string; line2: string; city: string; state: string; zip: string };

export async function placeAddress(placeId: string, sessionToken: string): Promise<PlaceAddress> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": KEY(), "X-Goog-FieldMask": "addressComponents" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Place details failed (${res.status})`);
  const json = await res.json();
  type C = { longText: string; shortText: string; types: string[] };
  const comps: C[] = json.addressComponents ?? [];
  const get = (t: string, short = false) => { const c = comps.find((x) => x.types.includes(t)); return c ? (short ? c.shortText : c.longText) : ""; };
  const number = get("street_number"), route = get("route", true);
  return {
    line1: [number, route].filter(Boolean).join(" "),
    line2: get("subpremise") ? `Unit ${get("subpremise")}` : "",
    city: get("locality") || get("sublocality") || get("postal_town") || get("administrative_area_level_3"),
    state: get("administrative_area_level_1", true),
    zip: get("postal_code"),
  };
}

/** Finds the map position of an address or ZIP code (Places API Text Search, same key). */
export async function geocode(text: string): Promise<{ lat: number; lng: number } | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) return null;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY(), "X-Goog-FieldMask": "places.location" },
    body: JSON.stringify({ textQuery: text, regionCode: "us", pageSize: 1 }),
    cache: "no-store",
  });
  if (!res.ok) { console.error("Geocode failed", res.status); return null; }
  const j = await res.json();
  const loc = j.places?.[0]?.location;
  return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
}
