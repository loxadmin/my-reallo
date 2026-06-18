import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, logUsage, randomToken, sha256, svc } from "../_shared/oauth.ts";

// POST body: { client_id, redirect_uri, scope:[], code_challenge, code_challenge_method, allow:boolean, state? }
// Requires Authorization: Bearer <Karbali user JWT>
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims, error: ce } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  if (ce || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
  const user_id = claims.claims.sub as string;

  const body = await req.json().catch(() => null) as any;
  if (!body?.client_id || !body?.redirect_uri || !Array.isArray(body?.scope) || !body?.code_challenge) {
    return json({ error: "invalid_request" }, 400);
  }

  const s = svc();
  const { data: app } = await s.from("oauth_apps").select("*").eq("client_id", body.client_id).maybeSingle();
  if (!app || app.status !== "approved") return json({ error: "invalid_client" }, 400);

  const { data: redirects } = await s.from("oauth_app_redirect_uris").select("uri").eq("app_id", app.id);
  if (!redirects?.some((r) => r.uri === body.redirect_uri)) return json({ error: "invalid_redirect_uri" }, 400);

  if (body.allow === false) {
    await logUsage(app.id, "consent_deny", 200, req);
    return json({ redirect: `${body.redirect_uri}?error=access_denied${body.state ? `&state=${encodeURIComponent(body.state)}` : ""}` });
  }

  // Persist consent
  await s.from("oauth_user_consents").upsert({
    user_id, app_id: app.id, scopes: body.scope, granted_at: new Date().toISOString(), revoked_at: null,
  }, { onConflict: "user_id,app_id" });

  // Issue authorization code
  const code = randomToken(32);
  const code_hash = await sha256(code);
  const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();
  await s.from("oauth_authorization_codes").insert({
    code_hash, app_id: app.id, user_id, scopes: body.scope,
    redirect_uri: body.redirect_uri,
    code_challenge: body.code_challenge,
    code_challenge_method: body.code_challenge_method || "S256",
    expires_at,
  });

  await logUsage(app.id, "consent_allow", 200, req);
  const redirect = `${body.redirect_uri}?code=${code}${body.state ? `&state=${encodeURIComponent(body.state)}` : ""}`;
  return json({ redirect });
});