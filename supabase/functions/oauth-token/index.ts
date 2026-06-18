import { corsHeaders, json, logUsage, randomToken, sha256, svc } from "../_shared/oauth.ts";

// PKCE S256 verify: base64url(sha256(verifier)) == challenge
function base64url(bytes: Uint8Array) {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function pkceMatches(verifier: string, challenge: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(h)) === challenge;
}

// POST { grant_type: 'authorization_code' | 'refresh_token', client_id, client_secret, code?, code_verifier?, redirect_uri?, refresh_token? }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => null) as any;
  if (!body?.client_id || !body?.client_secret || !body?.grant_type) return json({ error: "invalid_request" }, 400);

  const s = svc();
  const { data: app } = await s.from("oauth_apps").select("*").eq("client_id", body.client_id).maybeSingle();
  if (!app || app.status !== "approved") return json({ error: "invalid_client" }, 401);

  const secretHash = await sha256(body.client_secret);
  if (secretHash !== app.client_secret_hash) {
    await logUsage(app.id, "token", 401, req);
    return json({ error: "invalid_client_secret" }, 401);
  }

  const issueTokens = async (user_id: string, scopes: string[]) => {
    const access = randomToken(32);
    const refresh = randomToken(32);
    const access_hash = await sha256(access);
    const refresh_hash = await sha256(refresh);
    const exp = new Date(Date.now() + 60 * 60_000).toISOString();
    const rexp = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    await s.from("oauth_access_tokens").insert({ token_hash: access_hash, app_id: app.id, user_id, scopes, expires_at: exp });
    await s.from("oauth_refresh_tokens").insert({ token_hash: refresh_hash, app_id: app.id, user_id, scopes, expires_at: rexp });
    return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: 3600, scope: scopes.join(" ") };
  };

  if (body.grant_type === "authorization_code") {
    if (!body.code || !body.code_verifier || !body.redirect_uri) return json({ error: "invalid_request" }, 400);
    const code_hash = await sha256(body.code);
    const { data: c } = await s.from("oauth_authorization_codes").select("*").eq("code_hash", code_hash).maybeSingle();
    if (!c || c.used_at || new Date(c.expires_at) < new Date() || c.app_id !== app.id) {
      await logUsage(app.id, "token", 400, req); return json({ error: "invalid_grant" }, 400);
    }
    if (c.redirect_uri !== body.redirect_uri) return json({ error: "redirect_uri_mismatch" }, 400);
    if (!(await pkceMatches(body.code_verifier, c.code_challenge))) return json({ error: "invalid_pkce" }, 400);
    await s.from("oauth_authorization_codes").update({ used_at: new Date().toISOString() }).eq("id", c.id);
    const out = await issueTokens(c.user_id, c.scopes);
    await logUsage(app.id, "token", 200, req);
    return json(out);
  }

  if (body.grant_type === "refresh_token") {
    if (!body.refresh_token) return json({ error: "invalid_request" }, 400);
    const rh = await sha256(body.refresh_token);
    const { data: r } = await s.from("oauth_refresh_tokens").select("*").eq("token_hash", rh).maybeSingle();
    if (!r || r.revoked_at || new Date(r.expires_at) < new Date() || r.app_id !== app.id) {
      return json({ error: "invalid_grant" }, 400);
    }
    await s.from("oauth_refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", r.id);
    const out = await issueTokens(r.user_id, r.scopes);
    await logUsage(app.id, "token", 200, req);
    return json(out);
  }

  return json({ error: "unsupported_grant_type" }, 400);
});