const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Economics used to size every unlock path (Naira unlocked per completed action). */
const UNLOCK_PER_TASK = 1000;
const UNLOCK_PER_REFERRAL = 500;
const TASKS_PER_MONTH = 20;

type Tier = { label: string; depositPct: number; monthlyShare: number; taskShare: number; referralShare: number; note: string };

const TIERS: Tier[] = [
  { label: 'Free Plan — No Money Down', depositPct: 0, monthlyShare: 0, taskShare: 0.6, referralShare: 0.4, note: 'You put in nothing at all. Tasks and valid referrals fund the whole goal.' },
  { label: 'Starter — 10% Down', depositPct: 0.1, monthlyShare: 0.15, taskShare: 0.7, referralShare: 0.3, note: 'A small deposit cuts your task load.' },
  { label: 'Balanced — 20% Down', depositPct: 0.2, monthlyShare: 0.25, taskShare: 0.75, referralShare: 0.25, note: 'A fifth upfront, the rest through steady tasks.' },
  { label: 'Fast Track — 50% Down', depositPct: 0.5, monthlyShare: 0.35, taskShare: 0.85, referralShare: 0.15, note: 'Half upfront means far fewer tasks.' },
  { label: 'Express — 75% Down', depositPct: 0.75, monthlyShare: 0.45, taskShare: 0.9, referralShare: 0.1, note: 'Mostly funded, only a light task obligation left.' },
];

const buildOptions = (target: number, existingSavings: number, months: number, monthlyIncome: number) =>
  TIERS.map((tier) => {
    const deposit = Math.max(0, Math.round(target * tier.depositPct) - existingSavings);
    const remaining = Math.max(0, target - deposit - existingSavings);
    // What the user contributes monthly, never above 25% of stated monthly income.
    const affordable = monthlyIncome > 0 ? Math.round(monthlyIncome * 0.25) : Infinity;
    const monthly = tier.monthlyShare > 0
      ? Math.max(0, Math.min(affordable, Math.round((remaining * tier.monthlyShare) / months)))
      : 0;
    const toEarn = Math.max(0, remaining - monthly * months);
    const tasks = Math.ceil((toEarn * tier.taskShare) / UNLOCK_PER_TASK);
    const referrals = Math.ceil((toEarn * tier.referralShare) / UNLOCK_PER_REFERRAL);
    const perMonthTasks = Math.ceil(tasks / months);
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
        tasks_per_month: perMonthTasks,
        notes: `${tier.note} About ${perMonthTasks} task${perMonthTasks === 1 ? '' : 's'} a month and ${referrals} valid referrals across ${months} months.${savingsNote}`,
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
    const body = await req.json();
    const { target_amount } = body;
    const months = Math.max(6, Math.round(Number(body?.duration_months ?? 12) || 12));
    const monthlyIncome = Math.max(0, Math.round(Number(body?.monthly_income ?? 0) || 0));

    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle();
    const raw = (profile?.raw ?? {}) as Record<string, unknown>;
    const existingSavings = Math.max(0, Number(raw.goal_existing_savings ?? 0) || 0);
    const target = Math.max(0, Math.round(Number(target_amount ?? 0)));
    if (!target) return new Response(JSON.stringify({ error: 'A target amount is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await supabase.from('goal_account_options').delete().eq('user_id', userId).is('goal_account_id', null);

    const rows = buildOptions(target, existingSavings, months, monthlyIncome).map((o) => ({ user_id: userId, ...o }));
    const { data: inserted, error } = await supabase.from('goal_account_options').insert(rows).select();
    if (error) throw error;

    return new Response(JSON.stringify({ options: inserted ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
