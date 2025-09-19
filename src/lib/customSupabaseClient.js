import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lmxcmpksctnqsqwhfkvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteGNtcGtzY3RucXNxd2hma3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDgzNTIsImV4cCI6MjA3MDU4NDM1Mn0.YEiZ1RogTH8n9uwytnRo2ueimJlz_HkSi_COTLyGtKQ';

const timeoutFetch = async (input, init = {}) => {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  const timeoutMs = isDev ? 0 : 30000; // no timeout in dev; 30s in prod

  if (timeoutMs <= 0) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: timeoutFetch }
});