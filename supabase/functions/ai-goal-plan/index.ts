const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { title, target_amount, target_date } = await req.json();
    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', u.user.id).maybeSingle();

    const sys = `You are Karbali's financial planning AI. Given a user's goal and behavior profile, produce 2-3 realistic savings plans.
Consider: user brands used, spending, referral/task capability, deposits.
Return strict JSON: { "plans": [{ "name": "Plan A", "deposit": 0, "duration_months": 12, "monthly_contribution": 0, "requirements": ["higher referrals","more partner purchases"], "notes": "" }] }
No code fences. Amounts in Naira.`;
    const user = `Goal: ${title}\nTarget: ${target_amount} NGN\nTarget date: ${target_date ?? 'flexible'}\nProfile: ${JSON.stringify(profile ?? {})}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], response_format: { type: 'json_object' } }),
    });
    if (!aiResp.ok) return new Response(JSON.stringify({ error: 'AI error', detail: await aiResp.text() }), { status: aiResp.status, headers: corsHeaders });
    const aiJson = await aiResp.json();
    let out: any = {};
    try { out = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { out = { plans: [] }; }
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});