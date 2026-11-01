import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicKey } from "@/lib/supabase-config";

export function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getSupabasePublicKey();
  if (!url || !publicKey) throw new Error("Supabase public credentials are not configured.");

  return createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
