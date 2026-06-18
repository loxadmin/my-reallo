import { corsHeaders, hmacSign, json, logUsage, sha256, svc } from "../_shared/oauth.ts";

// POST { amount, reference?, userId? (ignored; derived from token) }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const token = auth.replace("Bearer ", "");
  const th = await sha256(token);
  const s = svc();
  const { data: at } = await s.from("oauth_access_tokens").select("*").eq("token_hash", th).maybeSingle();
  if (!at || at.revoked_at || new Date(at.expires_at) < new Date()) return json({ error: "invalid_token" }, 401);
  if (!at.scopes?.includes("points.matured.read")) return json({ error: "insufficient_scope" }, 403);

  const body = await req.json().catch(() => null) as any;
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) return json({ error: "invalid_amount" }, 400);

  const { data: matured } = await s.rpc("oauth_get_matured_points", { _user_id: at.user_id });
  if ((matured ?? 0) < amount) return json({ error: "insufficient_balance", maturedPoints: matured ?? 0 }, 400);

  const ref = body?.reference ?? crypto.randomUUID();
  const { data: tx, error } = await s.from("oauth_points_ledger").insert({
    user_id: at.user_id, app_id: at.app_id, amount: -amount, type: "spend", reference: ref,
  }).select("id").single();
  if (error) return json({ error: "ledger_failed", detail: error.message }, 500);

  // Deduct from profile balance
  await s.rpc("oauth_get_matured_points", { _user_id: at.user_id });
  await s.from("profiles").update({ points_balance: (matured ?? 0) - amount + ((await s.from("profiles").select("points_balance").eq("id", at.user_id).maybeSingle()).data?.points_balance ?? 0) - (matured ?? 0) }).eq("id", at.user_id);
  // Simpler: direct decrement
  const { data: prof } = await s.from("profiles").select("points_balance").eq("id", at.user_id).maybeSingle();
  await s.from("profiles").update({ points_balance: Math.max(0, (prof?.points_balance ?? 0) - amount) }).eq("id", at.user_id);

  // Queue webhook
  const { data: app } = await s.from("oauth_apps").select("client_secret_hash, id").eq("id", at.app_id).maybeSingle();
  const payload = { event: "points.spent", transactionId: tx.id, userId: at.user_id, amount, reference: ref, at: new Date().toISOString() };
  const sig = await hmacSign(app?.client_secret_hash ?? "", JSON.stringify(payload));
  await s.from("oauth_webhook_events").insert({ app_id: at.app_id, event_type: "points.spent", payload, signature: sig });

  const { data: remaining } = await s.rpc("oauth_get_matured_points", { _user_id: at.user_id });
  await logUsage(at.app_id, "spend", 200, req);
  return json({ success: true, transactionId: tx.id, remainingBalance: remaining ?? 0 });
});