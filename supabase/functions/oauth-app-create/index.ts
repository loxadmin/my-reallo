import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, randomToken, sha256, svc } from "../_shared/oauth.ts";

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
  const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  const uid = claims?.claims?.sub;
  if (!uid) return json({ error: "unauthorized" }, 401);
  const s = svc();
  const { data: roleRow } = await s.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "forbidden" }, 403);

  const b = await req.json().catch(() => null) as any;
  if (!b?.name) return json({ error: "invalid_request" }, 400);

  const client_id = "krb_" + randomToken(12);
  const client_secret = "krs_" + randomToken(24);
  const client_secret_hash = await sha256(client_secret);

  const { data: app, error } = await s.from("oauth_apps").insert({
    owner_user_id: b.owner_user_id ?? uid,
    name: b.name,
    description: b.description ?? null,
    company_name: b.company_name ?? null,
    website_url: b.website_url ?? null,
    logo_url: b.logo_url ?? null,
    contact_email: b.contact_email ?? null,
    environment: b.environment ?? "sandbox",
    status: "pending",
    client_id,
    client_secret_hash,
  }).select("*").single();
  if (error) return json({ error: error.message }, 500);

  if (Array.isArray(b.redirect_uris)) {
    for (const uri of b.redirect_uris) {
      await s.from("oauth_app_redirect_uris").insert({ app_id: app.id, uri });
    }
  }
  if (Array.isArray(b.domains)) {
    for (const domain of b.domains) {
      await s.from("oauth_app_domains").insert({ app_id: app.id, domain, verification_token: randomToken(16) });
    }
  }
  if (Array.isArray(b.scopes)) {
    for (const scope of b.scopes) {
      await s.from("oauth_app_scopes").insert({ app_id: app.id, scope, approved: false });
    }
  }

  return json({ app, client_secret });
});