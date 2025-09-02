import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lmxcmpksctnqsqwhfkvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteGNtcGtzY3RucXNxd2hma3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDgzNTIsImV4cCI6MjA3MDU4NDM1Mn0.YEiZ1RogTH8n9uwytnRo2ueimJlz_HkSi_COTLyGtKQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);