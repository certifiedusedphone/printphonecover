"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let c: SupabaseClient | null = null;
/** Anon client, used only to upload files through signed upload URLs. */
export function supabaseBrowser() {
  if (!c) c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  return c;
}
