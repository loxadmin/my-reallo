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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.referred_by) {
      return new Response(JSON.stringify({ message: "Referral already recorded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (referral_code) {
      const { data: referrer, error: referrerError } = await supabase
        .from("profiles")
        .select("id, queue_position, points_balance, off_queue_at")
        .eq("referral_code", referral_code.toUpperCase())
        .maybeSingle();

      if (referrerError) {
        throw referrerError;
      }

      if (referrer && referrer.id !== user.id) {
        const { error: updateReferredByError } = await supabase
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", user.id);

        if (updateReferredByError) {
          throw updateReferredByError;
        }

        const isOffQueue = (referrer.queue_position ?? 0) <= 0 || referrer.off_queue_at !== null;
        let activityType = "referral";
        let positionsMoved = 20;

        if (isOffQueue) {
          positionsMoved = 0;

          const { data: influencerApp, error: influencerError } = await supabase
            .from("influencer_applications")
            .select("id")
            .eq("user_id", referrer.id)
            .eq("status", "approved")
            .maybeSingle();

          if (influencerError) {
            throw influencerError;
          }

          if (!influencerApp) {
            activityType = "referral_points";

            const { error: pointsError } = await supabase
              .from("profiles")
              .update({ points_balance: (referrer.points_balance || 0) + 1000 })
              .eq("id", referrer.id);

            if (pointsError) {
              throw pointsError;
            }
          }
        } else {
          const newQueuePosition = Math.max(1, (referrer.queue_position ?? 100) - 20);
          const { error: queueError } = await supabase
            .from("profiles")
            .update({ queue_position: newQueuePosition })
            .eq("id", referrer.id);

          if (queueError) {
            throw queueError;
          }
        }

        const { error: referralInsertError } = await supabase
          .from("referrals")
          .insert({ referrer_id: referrer.id, referred_user_id: user.id });

        if (referralInsertError) {
          throw referralInsertError;
        }

        const { error: activityError } = await supabase
          .from("waitlist_activity")
          .insert({ user_id: referrer.id, action_type: activityType, positions_moved: positionsMoved });

        if (activityError) {
          throw activityError;
        }
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
