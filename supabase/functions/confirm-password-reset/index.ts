// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json(null);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Missing service configuration" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const token = String(body?.token || "");
  const newPassword = String(body?.password || "");
  if (!token || !newPassword || newPassword.length < 6) return json({ error: "Invalid payload" }, 400);

  const tokenHash = await sha256Hex(token);

  const { data: prt, error } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!prt || error) return json({ error: 'Invalid or expired token' }, 400);
  if (prt.used) return json({ error: 'Token already used' }, 400);
  if (new Date(prt.expires_at).getTime() < Date.now()) return json({ error: 'Token expired' }, 400);

  // Set new password using service role
  const { error: updErr } = await supabase.auth.admin.updateUserById(prt.user_id, { password: newPassword });
  if (updErr) return json({ error: updErr.message }, 400);

  await supabase.from('password_reset_tokens').update({ used: true }).eq('id', prt.id);
  return json({ ok: true });
});


