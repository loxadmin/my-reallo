import { corsHeaders, json, sha256, svc } from "../_shared/oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.json().catch(() => null) as any;
  if (!body?.token) return json({ error: "invalid_request" }, 400);
  const h = await sha256(body.token);
  const s = svc();
  await s.from("oauth_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("token_hash", h);
  await s.from("oauth_refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("token_hash", h);
  return json({ success: true });
});