import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicKey } from '@/lib/supabase-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = getSupabasePublicKey();

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
