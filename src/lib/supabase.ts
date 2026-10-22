import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlfobhufcuizwarfyfjn.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZm9iaHVmY3VpendhcmZ5ZmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NTg4MTcsImV4cCI6MjEwODIzNDgxN30.h1Tj9ov-3zqduaBTzZFUcee58nlwIvw4M-EUPJWxUyc'; // Thay key eyJ... của bạn vào đây

export const supabase = createClient(supabaseUrl, supabaseKey);