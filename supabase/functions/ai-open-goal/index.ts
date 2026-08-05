const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Economics used to size every unlock path (Naira unlocked per completed action). */
const UNLOCK_PER_TASK = 1000;
const UNLOCK_PER_REFERRAL = 500;
const TASKS_PER_MONTH = 20;

type Tier = { label: string; depositPct: number; taskShare: number; referralShare: number; note: string };

const TIERS: Tier[] = [
  { label: 'No Deposit — Full Hustle', depositPct: 0, taskShare: 0.6, referralShare: 0.4, note: 'Put in zero money. You unlock everything with tasks and valid referrals.' },
  { label: 'Starter — 10% Deposit', depositPct: 0.1, taskShare: 0.7, referralShare: 0.3, note: 'A small deposit cuts your task load and shortens the timeline.' },
  { label: 'Balanced — 20% Deposit', depositPct: 0.2, taskShare: 0.75, referralShare: 0.25, note: 'A fifth upfront, the rest through steady tasks.' },
  { label: 'Fast Track — 50% Deposit', depositPct: 0.5, taskShare: 0.85, referralShare: 0.15, note: 'Half upfront means far fewer tasks and a much shorter wait.' },
  { label: 'Express — 75% Deposit', depositPct: 0.75, taskShare: 0.9, referralShare: 0.1, note: 'The fastest route: mostly funded, only a light task obligation left.' },
];

const buildOptions = (target: number, existingSavings: number) => TIERS.map((tier) => {
  const deposit = Math.max(0, Math.round(target * tier.depositPct) - existingSavings);
  const remaining = Math.max(0, target - deposit - existingSavings);
  const tasks = Math.ceil((remaining * tier.taskShare) / UNLOCK_PER_TASK);
  const referrals = Math.ceil((remaining * tier.referralShare) / UNLOCK_PER_REFERRAL);
  const months = Math.max(1, Math.ceil(tasks / TASKS_PER_MONTH));
  const monthly = tier.depositPct > 0 ? Math.round((remaining * 0.1) / months) : 0;
  const savingsNote = existingSavings > 0 ? ` You already have ₦${existingSavings.toLocaleString()} saved, so this deposit is reduced.` : '';
  return {
    label: tier.label,
    deposit,
    duration_months: months,
    monthly_contribution: monthly,
    requirements: {
      referrals,
      tasks,
      purchases: 0,
      notes: `${tier.note} Estimated ${tasks} tasks and ${referrals} valid referrals over about ${months} month${months > 1 ? 's' : ''}.${savingsNote}`,
    },
  };
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const userId = u.user.id;
    const { target_amount } = await req.json();

    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle();
    const raw = (profile?.raw ?? {}) as Record<string, unknown>;
    const existingSavings = Math.max(0, Number(raw.goal_existing_savings ?? 0) || 0);
    const target = Math.max(0, Math.round(Number(target_amount ?? 0)));
    if (!target) return new Response(JSON.stringify({ error: 'A target amount is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await supabase.from('goal_account_options').delete().eq('user_id', userId).is('goal_account_id', null);

    const rows = buildOptions(target, existingSavings).map((o) => ({ user_id: userId, ...o }));
    const { data: inserted, error } = await supabase.from('goal_account_options').insert(rows).select();
    if (error) throw error;

    return new Response(JSON.stringify({ options: inserted ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
