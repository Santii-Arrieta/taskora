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

function generateToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json(null);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SMTP_ENDPOINT = Deno.env.get("SMTP_ENDPOINT") || "http://localhost:8787/send-email";
  const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Missing service configuration" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) return json({ error: "Email is required" }, 400);

  // Find user profile by email
  const { data: userProfile } = await supabase.from("users").select("id, email, name").eq("email", email).maybeSingle();

  // Always return ok to avoid email enumeration
  if (!userProfile) return json({ ok: true });

  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

  // Ensure table exists (best-effort)
  await supabase.rpc("exec_sql", { sql: `
    create table if not exists password_reset_tokens (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      token_hash text not null,
      expires_at timestamptz not null,
      used boolean not null default false,
      created_at timestamptz not null default now()
    );
    create index if not exists idx_prt_user_id on password_reset_tokens(user_id);
  ` }).catch(() => {});

  await supabase.from("password_reset_tokens").insert({
    user_id: userProfile.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const resetLink = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0B132B;">
      <h2 style="margin:0 0 8px">Restablecer tu contraseña</h2>
      <p>Hacé clic en el botón para establecer una nueva contraseña. Este enlace expira en 1 hora.</p>
      <p style="margin: 20px 0;"><a href="${resetLink}" style="background:#5B7FFF;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">Establecer nueva contraseña</a></p>
      <p>Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
      <p style="font-size:12px;word-break:break-all;color:#334155;">${resetLink}</p>
    </div>
  `;

  await fetch(SMTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: email, subject: "Restablecer contraseña - Taskora", html }),
  }).catch(() => {});

  return json({ ok: true });
});


