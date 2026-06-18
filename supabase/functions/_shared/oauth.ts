import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function logUsage(
  app_id: string | null,
  endpoint: string,
  status: number,
  req: Request,
) {
  try {
    await svc().from("oauth_api_usage").insert({
      app_id,
      endpoint,
      status,
      ip: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });
  } catch (_) { /* ignore */ }
}

export async function rateLimit(
  app_id: string,
  endpoint: string,
  perMinute = 60,
): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await svc()
    .from("oauth_api_usage")
    .select("id", { count: "exact", head: true })
    .eq("app_id", app_id)
    .eq("endpoint", endpoint)
    .gte("created_at", since);
  return (count ?? 0) < perMinute;
}

export async function hmacSign(
  secret: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ALL_SCOPES = [
  "profile.read",
  "email.read",
  "username.read",
  "points.read",
  "points.balance.read",
  "points.matured.read",
] as const;

export const FUTURE_SCOPES = [
  "savings.read",
  "goals.read",
  "transactions.read",
] as const;