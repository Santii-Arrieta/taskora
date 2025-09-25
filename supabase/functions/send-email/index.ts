// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: send-email
// Uses Deno SMTP client to send transactional emails via Hostinger SMTP

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

type SendEmailRequest = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
};

function jsonResponse(body: unknown, status = 200) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: SendEmailRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") || "465");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const defaultFromEmail = Deno.env.get("FROM_EMAIL") || "admin@taskora.webexperiencepro.com";
  const defaultFromName = Deno.env.get("FROM_NAME") || "Taskora";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return jsonResponse({ error: "SMTP is not configured on the server" }, 500);
  }

  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
  if (!toAddresses.length || !payload.subject || !payload.html) {
    return jsonResponse({ error: "Missing 'to', 'subject' or 'html'" }, 400);
  }

  const client = new SmtpClient();

  async function sendWithTLS() {
    await client.connectTLS({
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
    });
  }

  async function sendWithSTARTTLS() {
    const port = smtpPort === 465 ? 587 : smtpPort;
    await client.connect({
      hostname: smtpHost,
      port,
      username: smtpUser,
      password: smtpPass,
      // STARTTLS upgrade happens automatically in the library when supported
    } as any);
  }

  try {
    try {
      await sendWithTLS();
    } catch (_e) {
      try { await client.close(); } catch {}
      await sendWithSTARTTLS();
    }

    const fromHeader = `${payload.fromName || defaultFromName} <${payload.fromEmail || defaultFromEmail}>`;

    for (const recipient of toAddresses) {
      await client.send({
        from: fromHeader,
        to: recipient,
        subject: payload.subject,
        content: payload.text || "",
        html: payload.html,
      } as any);
    }

    await client.close();
    return jsonResponse({ ok: true });
  } catch (error) {
    try { await client.close(); } catch {}
    return jsonResponse({ error: String((error && (error as Error).message) || error) }, 500);
  }
});


