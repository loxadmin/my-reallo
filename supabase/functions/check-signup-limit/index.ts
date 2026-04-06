import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ACCOUNTS_PER_IDENTIFIER = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, device_fingerprint, user_id } = await req.json();

    // Check if signup limit is enabled in admin_settings
    const { data: limitSetting } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "signup_limit_enabled")
      .maybeSingle();

    const limitEnabled = limitSetting?.value !== "false";

    // Get client IP from headers (Supabase Edge Functions provide this)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (action === "check") {
      if (!limitEnabled) {
        return new Response(
          JSON.stringify({ allowed: true, ip: clientIp, bypass: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check how many accounts exist for this IP or device fingerprint
      const { count: ipCount } = await supabase
        .from("signup_devices")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", clientIp);

      const { count: deviceCount } = await supabase
        .from("signup_devices")
        .select("*", { count: "exact", head: true })
        .eq("device_fingerprint", device_fingerprint);

      const blocked =
        (ipCount ?? 0) >= MAX_ACCOUNTS_PER_IDENTIFIER ||
        (deviceCount ?? 0) >= MAX_ACCOUNTS_PER_IDENTIFIER;

      return new Response(
        JSON.stringify({ allowed: !blocked, ip: clientIp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      if (!user_id || !device_fingerprint) {
        return new Response(
          JSON.stringify({ error: "user_id and device_fingerprint required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (limitEnabled) {
        // Double-check limits before inserting
        const { count: ipCount } = await supabase
          .from("signup_devices")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", clientIp);

        const { count: deviceCount } = await supabase
          .from("signup_devices")
          .select("*", { count: "exact", head: true })
          .eq("device_fingerprint", device_fingerprint);

        if (
          (ipCount ?? 0) >= MAX_ACCOUNTS_PER_IDENTIFIER ||
          (deviceCount ?? 0) >= MAX_ACCOUNTS_PER_IDENTIFIER
        ) {
          return new Response(
            JSON.stringify({ error: "Account limit reached for this device or network" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error } = await supabase.from("signup_devices").insert({
        user_id,
        ip_address: clientIp,
        device_fingerprint,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use check or register" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
