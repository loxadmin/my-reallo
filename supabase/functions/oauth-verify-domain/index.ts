import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, svc } from "../_shared/oauth.ts";

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

  const body = await req.json().catch(() => null) as any;
  if (!body?.domain_id) return json({ error: "invalid_request" }, 400);
  const { data: d } = await s.from("oauth_app_domains").select("*").eq("id", body.domain_id).maybeSingle();
  if (!d) return json({ error: "not_found" }, 404);

  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(d.domain)}&type=TXT`);
    const j = await resp.json();
    const answers: string[] = (j.Answer || []).map((a: any) => (a.data as string).replace(/^"|"$/g, ""));
    const expected = `karbali-verification=${d.verification_token}`;
    const matched = answers.some((a) => a.includes(expected));
    if (matched) {
      await s.from("oauth_app_domains").update({ verified_at: new Date().toISOString() }).eq("id", d.id);
      return json({ verified: true });
    }
    return json({ verified: false, expected, found: answers });
  } catch (e) {
    return json({ verified: false, error: String(e) }, 500);
  }
});