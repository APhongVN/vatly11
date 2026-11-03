import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey } from "@/lib/supabase-config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = getSupabasePublicKey();

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  cookieOptions: {
    maxAge: 400 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
