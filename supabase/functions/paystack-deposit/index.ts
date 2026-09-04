import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Goal Account deposits through Paystack.
 * action=init    -> creates a pending deposit and returns the Paystack checkout URL
 * action=verify  -> confirms the transaction with Paystack and credits the goal deposit
 * All amounts are Naira (kobo conversion happens here). Nothing is trusted from the client
 * except the goal id and the requested amount.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? 'init');

    if (action === 'init') {
      const amount = Math.round(Number(body?.amount ?? 0));
      const goalId = body?.goal_account_id ? String(body.goal_account_id) : null;
      if (!Number.isFinite(amount) || amount < 100) return json({ error: 'Minimum deposit is ₦100' }, 400);

      if (goalId) {
        const { data: goal } = await supabase.from('goal_accounts').select('id').eq('id', goalId).eq('user_id', userId).maybeSingle();
        if (!goal) return json({ error: 'Goal not found' }, 400);
      }

      const reference = `KRB-${crypto.randomUUID()}`;
      const origin = req.headers.get('origin') ?? '';

      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: u.user.email,
          amount: amount * 100,
          reference,
          callback_url: origin ? `${origin}/dashboard?deposit=${reference}` : undefined,
        }),
      });
      const pay = await res.json();
      if (!res.ok || !pay?.status) return json({ error: pay?.message ?? 'Paystack error' }, 502);

      await supabase.from('deposits').insert({
        user_id: userId, goal_account_id: goalId, amount, reference, status: 'pending',
      });

      return json({ authorization_url: pay.data.authorization_url, reference });
    }

    if (action === 'verify') {
      const reference = String(body?.reference ?? '');
      if (!reference) return json({ error: 'Reference required' }, 400);

      const { data: dep } = await supabase.from('deposits').select('*').eq('reference', reference).maybeSingle();
      if (!dep || dep.user_id !== userId) return json({ error: 'Deposit not found' }, 404);
      if (dep.status === 'success') return json({ status: 'success', amount: dep.amount });

      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const pay = await res.json();
      const paid = pay?.data?.status === 'success' && Number(pay?.data?.amount) >= Number(dep.amount) * 100;

      await supabase.from('deposits').update({
        status: paid ? 'success' : 'failed',
        paid_at: paid ? new Date().toISOString() : null,
        metadata: pay?.data ?? {},
      }).eq('id', dep.id);

      if (paid && dep.goal_account_id) {
        const { data: goal } = await supabase.from('goal_accounts').select('deposit_paid').eq('id', dep.goal_account_id).maybeSingle();
        await supabase.from('goal_accounts')
          .update({ deposit_paid: Number(goal?.deposit_paid ?? 0) + Number(dep.amount) })
          .eq('id', dep.goal_account_id);
      }

      return json({ status: paid ? 'success' : 'failed', amount: dep.amount });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
