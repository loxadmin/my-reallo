import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referral_code } = await req.json();
    if (!referral_code) {
      return new Response(JSON.stringify({ error: "Missing referral code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, queue_position")
      .eq("referral_code", referral_code.toUpperCase())
      .single();

    if (!referrer) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", referrer.id)
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already referred" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Award skip
    const newPos = Math.max(1, referrer.queue_position - 5);
    await supabase
      .from("profiles")
      .update({ queue_position: newPos })
      .eq("id", referrer.id);

    await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_user_id: user.id,
    });

    await supabase.from("waitlist_activity").insert({
      user_id: referrer.id,
      action_type: "referral",
      positions_moved: 5,
    });

    return new Response(
      JSON.stringify({ success: true, new_position: newPos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
