const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** 1 point = ₦0.5, so ₦1 = 2 points. */
const POINTS_PER_NAIRA = 2;

type Tier = { label: string; depositPct: number; note: string };

/**
 * Goal Accounts have NO duration. A goal unlocks the moment its points target is met.
 * A bigger deposit always means fewer points to earn — never more.
 */
const TIERS: Tier[] = [
  { label: 'No deposit', depositPct: 0, note: 'Put in nothing. Earn every point through tasks, referrals and offers.' },
  { label: '10% deposit', depositPct: 0.1, note: 'A small deposit cuts your points target by 10%.' },
  { label: '25% deposit', depositPct: 0.25, note: 'A quarter upfront, the rest earned.' },
  { label: '50% deposit', depositPct: 0.5, note: 'Half upfront halves the points you need.' },
  { label: '75% deposit', depositPct: 0.75, note: 'Mostly funded — a light points target remains.' },
];

const buildOptions = (target: number, existingSavings: number) =>
  TIERS.map((tier) => {
    const deposit = Math.max(0, Math.round(target * tier.depositPct) - existingSavings);
    const remaining = Math.max(0, target - deposit - existingSavings);
    const pointsRequired = Math.round(remaining * POINTS_PER_NAIRA);
    return {
      label: tier.label,
      deposit,
      deposit_percent: tier.depositPct,
      points_required: pointsRequired,
      duration_months: null,
      monthly_contribution: 0,
      requirements: {
        points: pointsRequired,
        deposit,
        notes: `${tier.note} You need ${pointsRequired.toLocaleString()} points${deposit > 0 ? ` plus a ₦${deposit.toLocaleString()} deposit` : ''} to unlock this goal. There is no deadline.`,
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

    const { data: profile } = await supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle();
    const raw = (profile?.raw ?? {}) as Record<string, unknown>;
    const existingSavings = Math.max(0, Number(raw.goal_existing_savings ?? 0) || 0);
    const target = Math.max(0, Math.round(Number(body?.target_amount ?? 0)));
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
