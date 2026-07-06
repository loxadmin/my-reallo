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
    const { goal_account_id } = await req.json();

    const { data: goal } = await supabase.from('goal_accounts').select('*').eq('id', goal_account_id).eq('user_id', u.user.id).maybeSingle();
    if (!goal) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', u.user.id).maybeSingle();

    const progress = Number(goal.unlocked_amount) / Number(goal.target_amount);
    const sys = `You are Karbali's goal coach. Analyze goal progress and return short JSON coaching:
{ "on_track": true, "suggestion": "…one paragraph, warm, specific to their brands and habits…", "actions": ["Refer 5 more friends","Complete 2 partner surveys","Switch OPay purchases to PalmPay"] }
No code fences.`;
    const usr = `Goal: ${goal.title} | Target ₦${goal.target_amount} | Unlocked ₦${goal.unlocked_amount} (${(progress*100).toFixed(0)}%) | Plan: ${JSON.stringify(goal.plan)} | Profile: ${JSON.stringify(profile ?? {})}`;
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], response_format: { type: 'json_object' } }),
    });
    if (!aiResp.ok) return new Response(JSON.stringify({ error: 'AI error' }), { status: aiResp.status, headers: corsHeaders });
    const aiJson = await aiResp.json();
    let out: any = {};
    try { out = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { out = { suggestion: aiJson.choices?.[0]?.message?.content ?? '' }; }
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});