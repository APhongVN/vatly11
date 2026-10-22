import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlfobhufcuizwarfyfjn.supabase.co'; 
const supabaseKey = 'DÁN_KEY_LEGACY_CỦA_BẠN_VÀO_ĐÂY'; 

export const supabase = createClient(supabaseUrl, supabaseKey);