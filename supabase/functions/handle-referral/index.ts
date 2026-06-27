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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referral_code } = await req.json();
    if (!referral_code) {
      return new Response(JSON.stringify({ error: "Missing referral code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, queue_position, points_balance, off_queue_at")
      .eq("referral_code", referral_code.toUpperCase())
      .maybeSingle();

    if (!referrer) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", referrer.id)
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already referred" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOffQueue = referrer.queue_position <= 0 && referrer.off_queue_at !== null;

    // Queue skip is applied immediately (queue mechanic, not a monetary reward).
    // Point/wallet rewards are now held until the referred user completes an approved task
    // (handled by mark_referral_valid SQL function).
    if (!isOffQueue && referrer.queue_position > 0) {
      // Skip 20 positions for on-queue users
      const newPos = Math.max(1, (referrer.queue_position || 0) - 20);
      await supabase
        .from("profiles")
        .update({ queue_position: newPos })
        .eq("id", referrer.id);

      await supabase.from("waitlist_activity").insert({
        user_id: referrer.id,
        action_type: "referral",
        positions_moved: 20,
      });
    }

    await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_user_id: user.id,
      status: "pending",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
