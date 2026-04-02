import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referral_code, device_fingerprint } = await req.json();

    // Check if this user already has a referrer (don't double-process)
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", user.id)
      .single();

    if (profile?.referred_by) {
      return new Response(JSON.stringify({ message: "Referral already recorded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process referral code if provided
    if (referral_code) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id, queue_position, off_queue_at")
        .select("id, queue_position, points_balance, off_queue_at")
        .eq("referral_code", referral_code.toUpperCase())
        .single();

      if (referrer && referrer.id !== user.id) {
        // Update referred_by
        await supabase
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", user.id);

        // Check if referrer is off-queue: award 1000 points instead of queue skip
        if (referrer.queue_position <= 0 && referrer.off_queue_at) {
          const { data: refProfile } = await supabase.from("profiles").select("points_balance").eq("id", referrer.id).single();
          await supabase
            .from("profiles")
            .update({ points_balance: (refProfile?.points_balance || 0) + 1000 })
            .eq("id", referrer.id);

          await supabase
            .from("waitlist_activity")
            .insert({ user_id: referrer.id, action_type: "referral_points", positions_moved: 0 });
        } else {
          await supabase
            .from("profiles")
            .update({ queue_position: Math.max(1, (referrer.queue_position ?? 100) - 20) })
            .eq("id", referrer.id);

        const isOffQueue = referrer.queue_position === 0 || referrer.off_queue_at !== null;

        if (isOffQueue) {
          // Check if influencer
          const { data: influencerApp } = await supabase
            .from("influencer_applications")
            .select("id")
            .eq("user_id", referrer.id)
            .eq("status", "approved")
            .maybeSingle();

          if (!influencerApp) {
            // Award 1000 points to off-queue non-influencers
            await supabase
              .from("profiles")
              .update({ points_balance: (referrer.points_balance || 0) + 1000 })
              .eq("id", referrer.id);

            await supabase.from("referrals").insert({
              referrer_id: referrer.id,
              referred_user_id: user.id,
            });

            await supabase.from("waitlist_activity").insert({
              user_id: referrer.id,
              action_type: "referral",
              positions_moved: 0,
            });

            // Continue to device registration if needed, but referral is handled
          } else {
            // Influencer off-queue - no points, just record referral
            await supabase.from("referrals").insert({
              referrer_id: referrer.id,
              referred_user_id: user.id,
            });

            await supabase.from("waitlist_activity").insert({
              user_id: referrer.id,
              action_type: "referral",
              positions_moved: 0,
            });
          }
        } else {
          // Normal user on queue - bump queue position
          const newPos = Math.max(1, (referrer.queue_position ?? 100) - 20);
          await supabase
            .from("profiles")
            .update({ queue_position: newPos })
            .eq("id", referrer.id);

          // Record the referral
          await supabase
            .from("referrals")
            .insert({ referrer_id: referrer.id, referred_user_id: user.id });

          // Record waitlist activity
          await supabase
            .from("waitlist_activity")
            .insert({ user_id: referrer.id, action_type: "referral", positions_moved: 20 });
        }

        // Record the referral
        await supabase
          .from("referrals")
          .insert({ referrer_id: referrer.id, referred_user_id: user.id });
      }
    }

    // Register device/IP for signup limiting
    if (device_fingerprint) {
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";

      // Check if already registered for this user
      const { count } = await supabase
        .from("signup_devices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) === 0) {
        await supabase.from("signup_devices").insert({
          user_id: user.id,
          ip_address: clientIp,
          device_fingerprint,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
