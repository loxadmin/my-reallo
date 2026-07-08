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
    const userId = u.user.id;
    const { title, target_amount, target_date } = await req.json();

    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle();

    const existingSavings = Number(profile?.financial?.goal_existing_savings ?? profile?.raw?.goal_existing_savings ?? 0) || 0;

    const targetNum = Math.max(0, Number(target_amount ?? 0) | 0);
    // Scale the no-money referral requirement to the goal size so it feels realistic.
    // Rough rule: ~1 referral per ₦2,000 of goal, clamped between 50 and 1500.
    const scaledReferrals = Math.min(1500, Math.max(50, Math.round(targetNum / 2000)));

    const sys = `You are Karbali's Goal Account strategist. Design EXACTLY 5 realistic, DIFFERENT Goal Account paths tailored to this specific user's goal, timeline, income capacity, and any savings they already have.

Rules:
- Amounts are in Naira. All numeric fields are integers.
- The 5 options MUST span the effort spectrum, roughly:
  1) HIGH DEPOSIT, SHORT PATH — biggest upfront deposit (about 10% of target if they can afford it), lowest tasks/referrals, shortest duration.
  2) MEDIUM DEPOSIT, BALANCED — moderate deposit + moderate tasks/referrals + moderate monthly contribution.
  3) LOW DEPOSIT, LONGER — small deposit, more tasks & partner purchases, longer duration.
  4) TASKS + REFERRALS ONLY — deposit = 0, higher referrals + tasks + purchases, longer duration.
  5) REFERRAL CHAMPION (no money) — deposit = 0, minimal or no monthly contribution. requirements.referrals MUST scale to the goal size — use approximately ${scaledReferrals} referrals within a 30-day window (never a flat 1000 for tiny goals or a tiny number for huge goals). Put "${scaledReferrals}+ valid referrals within 30 days" in requirements.notes.
- If the user already has savings, treat that as a head-start: option 1 or 2 can subtract savings from the deposit and mention it in requirements.notes ("You already have ₦X saved — deposit reduced accordingly.").
- Vary duration_months across options so users see meaningful trade-offs (e.g. 3, 6, 12, 18, 24 depending on goal size).
- Requirements object per option: { referrals: int, tasks: int, purchases: int, notes: string } — notes must be a friendly one-line explanation of what unlocks this path.
- Give each option a short human label like "Fast Track", "Balanced Builder", "Slow & Steady", "Hustle Path", "Referral Champion".

Return STRICT JSON only (no code fences):
{ "options": [
  { "label": "", "deposit": 0, "duration_months": 12, "monthly_contribution": 0, "requirements": { "referrals": 0, "tasks": 0, "purchases": 0, "notes": "" } }
] }`;
    const usr = `Goal: ${title}\nTarget: ${target_amount} NGN\nTarget date: ${target_date ?? 'flexible'}\nExisting savings toward this goal: ${existingSavings} NGN\nProfile: ${JSON.stringify(profile ?? {})}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-pro', messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], response_format: { type: 'json_object' }, temperature: 0.7 }),
    });
    if (!aiResp.ok) return new Response(JSON.stringify({ error: 'AI error', detail: await aiResp.text() }), { status: aiResp.status, headers: corsHeaders });
    const aiJson = await aiResp.json();
    let out: any = { options: [] };
    try { out = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { /* noop */ }
    const opts = Array.isArray(out.options) ? out.options.slice(0, 5) : [];

    // Enforce the "no-money" path rule: any option with deposit=0 AND monthly_contribution=0
    // must require at least 1000 referrals in 30 days.
    for (const o of opts) {
      const dep = Number(o?.deposit ?? 0);
      const monthly = Number(o?.monthly_contribution ?? 0);
      o.requirements = o.requirements ?? {};
      if (dep === 0 && monthly === 0) {
        const refs = Number(o.requirements.referrals ?? 0);
        if (refs < scaledReferrals) o.requirements.referrals = scaledReferrals;
        const note = String(o.requirements.notes ?? '');
        const finalRefs = o.requirements.referrals;
        if (!new RegExp(String(finalRefs)).test(note)) {
          o.requirements.notes = (note ? note + ' ' : '') + `Unlocks with ${finalRefs}+ valid referrals within 30 days.`;
        }
      }
    }

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