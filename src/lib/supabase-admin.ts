import "server-only";
import { createClient } from "@supabase/supabase-js";

const getAdminApiKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseAdminKey() {
  return Boolean(getAdminApiKey());
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminApiKey = getAdminApiKey();
  if (!url || !adminApiKey) {
    throw new Error("Supabase server credentials are not configured.");
  }
  return createClient(url, adminApiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
