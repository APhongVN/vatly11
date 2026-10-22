import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://nlfobhufcuizwarfyfjn.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZm9iaHVmY3VpendhcmZ5ZmpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY1ODgxNywiZXhwIjoyMTA4MjM0ODE3fQ.5GXtVI42GAa0sxr3GKUh1_Bawt_myjR3jhenLRrcppg'; 

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);