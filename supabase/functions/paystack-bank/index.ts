import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'PAYSTACK_SECRET_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Support both query params (GET) and body (POST)
    let action: string | null = null;
    let accountNumber: string | null = null;
    let bankCode: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json();
      action = body.action;
      accountNumber = body.account_number;
      bankCode = body.bank_code;
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get('action');
      accountNumber = url.searchParams.get('account_number');
      bankCode = url.searchParams.get('bank_code');
    }

    if (action === 'list-banks') {
      const res = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'resolve-account') {
      if (!accountNumber || !bankCode) {
        return new Response(JSON.stringify({ error: 'account_number and bank_code required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use list-banks or resolve-account' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
