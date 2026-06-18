import { corsHeaders, json, logUsage, sha256, svc } from "../_shared/oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = auth.replace("Bearer ", "");
  const th = await sha256(token);
  const s = svc();
  const { data: at } = await s.from("oauth_access_tokens").select("*").eq("token_hash", th).maybeSingle();
  if (!at || at.revoked_at || new Date(at.expires_at) < new Date()) {
    return json({ error: "invalid_token" }, 401);
  }

  const { data: profile } = await s.from("profiles").select("id, email, points_balance, referral_code").eq("id", at.user_id).maybeSingle();
  if (!profile) return json({ error: "user_not_found" }, 404);

  const scopes: string[] = at.scopes ?? [];
  const out: Record<string, unknown> = { id: profile.id };
  if (scopes.includes("email.read")) out.email = profile.email;
  if (scopes.includes("username.read")) out.username = (profile.email ?? "").split("@")[0];
  if (scopes.includes("profile.read")) {
    out.username = (profile.email ?? "").split("@")[0];
    out.referralCode = (profile as any).referral_code ?? null;
  }
  if (scopes.includes("points.read") || scopes.includes("points.balance.read")) {
    out.pointsBalance = profile.points_balance ?? 0;
  }
  if (scopes.includes("points.matured.read")) {
    const { data: matured } = await s.rpc("oauth_get_matured_points", { _user_id: at.user_id });
    out.maturedPoints = matured ?? 0;
  }

  await logUsage(at.app_id, "userinfo", 200, req);
  return json(out);
});