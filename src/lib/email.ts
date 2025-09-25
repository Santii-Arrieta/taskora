import { supabase } from '@/lib/customSupabaseClient';

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
};

export async function sendTransactionalEmail(params: SendEmailParams) {
  // Prefer local SMTP microservice if available; fallback to edge function
  try {
    const endpoint = (import.meta as any)?.env?.VITE_SMTP_ENDPOINT || '/send-email';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (_e) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });
    if (error || (data as any)?.error) {
      throw new Error((error && error.message) || (data as any)?.error || 'Email send failed');
    }
    return data;
  }
}


