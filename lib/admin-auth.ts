// Admin login cookie: HMAC of a fixed message with ADMIN_SECRET.
// Uses Web Crypto so it also works in middleware (edge runtime).
export const ADMIN_COOKIE = "ppc_admin";

export async function adminToken() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16) throw new Error("ADMIN_SECRET must be set (16+ characters).");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("printphonecover-admin-v1"));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdminCookie(value: string | undefined) {
  if (!value) return false;
  try { return value === (await adminToken()); } catch { return false; }
}
