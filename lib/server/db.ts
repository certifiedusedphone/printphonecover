import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Service-role client. Server only — never import this into a client component. */
export function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const BUCKET = "orders";

export async function signedUrl(path: string | null, seconds = 60 * 60, download?: string) {
  if (!path) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, seconds, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
