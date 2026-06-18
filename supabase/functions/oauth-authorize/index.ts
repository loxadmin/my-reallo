import { corsHeaders, json, logUsage, svc } from "../_shared/oauth.ts";

// GET /oauth-authorize?client_id=&redirect_uri=&scope=&state=&code_challenge=&code_challenge_method=S256
// Returns app metadata + the requested/approved scopes so the consent UI can render.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id");
  const redirect_uri = url.searchParams.get("redirect_uri");
  const scope = (url.searchParams.get("scope") || "").split(/\s+/).filter(Boolean);
  const code_challenge = url.searchParams.get("code_challenge");
  const code_challenge_method = url.searchParams.get("code_challenge_method") || "S256";

  if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== "S256") {
    await logUsage(null, "authorize", 400, req);
    return json({ error: "invalid_request" }, 400);
  }

  const s = svc();
  const { data: app } = await s.from("oauth_apps").select("*").eq("client_id", client_id).maybeSingle();
  if (!app) { await logUsage(null, "authorize", 404, req); return json({ error: "invalid_client" }, 404); }
  if (app.status !== "approved") { await logUsage(app.id, "authorize", 403, req); return json({ error: "app_not_approved" }, 403); }

  const { data: redirects } = await s.from("oauth_app_redirect_uris").select("uri").eq("app_id", app.id);
  if (!redirects?.some((r) => r.uri === redirect_uri)) {
    await logUsage(app.id, "authorize", 400, req);
    return json({ error: "invalid_redirect_uri" }, 400);
  }

  const { data: appScopes } = await s.from("oauth_app_scopes").select("scope, approved").eq("app_id", app.id);
  const approved = new Set((appScopes ?? []).filter((x) => x.approved).map((x) => x.scope));
  const allowed = scope.filter((sc) => approved.has(sc));
  if (allowed.length === 0) {
    await logUsage(app.id, "authorize", 400, req);
    return json({ error: "no_approved_scopes" }, 400);
  }

  await logUsage(app.id, "authorize", 200, req);
  return json({
    app: {
      id: app.id,
      name: app.name,
      logo_url: app.logo_url,
      company_name: app.company_name,
      website_url: app.website_url,
    },
    scopes: allowed,
    redirect_uri,
    code_challenge,
    code_challenge_method,
  });
});