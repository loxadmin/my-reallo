import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
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
    const userId = u.user.id;
    const { title, target_amount, target_date } = await req.json();

    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle();

    const sys = `You are Karbali's Goal Account strategist. The user wants to open a funded Goal Account.
Given their goal + profile + financial capacity, produce EXACTLY 3 realistic paths that vary by deposit vs task/referral effort.
Return strict JSON only (no code fences):
{ "options": [
  { "label": "Fast Track", "deposit": 0, "duration_months": 12, "monthly_contribution": 0, "requirements": { "referrals": 0, "tasks": 0, "purchases": 0, "notes": "" } }
] }
Amounts in Naira. Options should progress: A=higher deposit shorter time, B=medium, C=no deposit longer time with more tasks/referrals.`;
    const usr = `Goal: ${title}\nTarget: ${target_amount} NGN\nTarget date: ${target_date ?? 'flexible'}\nProfile: ${JSON.stringify(profile ?? {})}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], response_format: { type: 'json_object' } }),
    });
    if (!aiResp.ok) return new Response(JSON.stringify({ error: 'AI error', detail: await aiResp.text() }), { status: aiResp.status, headers: corsHeaders });
    const aiJson = await aiResp.json();
    let out: any = { options: [] };
    try { out = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { /* noop */ }
    const opts = Array.isArray(out.options) ? out.options.slice(0, 3) : [];

    // Clear any prior unattached options for this user
    await supabase.from('goal_account_options').delete().eq('user_id', userId).is('goal_account_id', null);

    const rows = opts.map((o: any) => ({
      user_id: userId,
      label: String(o.label ?? 'Option'),
      deposit: Math.max(0, Number(o.deposit ?? 0) | 0),
      duration_months: Math.max(1, Number(o.duration_months ?? 12) | 0),
      monthly_contribution: Math.max(0, Number(o.monthly_contribution ?? 0) | 0),
      requirements: o.requirements ?? {},
    }));
    const { data: inserted } = await supabase.from('goal_account_options').insert(rows).select();
    return new Response(JSON.stringify({ options: inserted ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});