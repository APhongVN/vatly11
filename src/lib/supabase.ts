import { createClient } from '@supabase/supabase-js';

// Dùng giá trị mặc định nếu chưa có biến môi trường (tránh lỗi build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);