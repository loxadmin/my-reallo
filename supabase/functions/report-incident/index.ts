import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, details, fingerprint, severity } = await req.json();

    // Improved IP extraction logic
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const ip_address = req.headers.get("x-real-ip") ||
                      (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null) ||
                      "unknown";

    // Get user ID if available (optional)
    const authHeader = req.headers.get("Authorization");
    let user_id = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      user_id = user?.id;
    }

    // Log the security incident
    const { error: incidentError } = await supabaseClient
      .from("security_incidents")
      .insert({
        type,
        details,
        ip_address,
        fingerprint,
        user_id,
        severity: severity || "low"
      });

    if (incidentError) throw incidentError;

    // Automatic blacklisting for critical, high, or specific trap triggers
    const autoBlacklistTypes = ["honeypot_triggered", "malicious_input", "unauthorized_admin_access"];
    if (severity === "critical" || severity === "high" || autoBlacklistTypes.includes(type)) {
      // Check if already blacklisted to avoid duplicates
      const { data: existing } = await supabaseClient
        .from("blacklisted_entities")
        .select("id")
        .or(`ip_address.eq.${ip_address},fingerprint.eq.${fingerprint}`)
        .maybeSingle();

      if (!existing) {
        await supabaseClient
          .from("blacklisted_entities")
          .insert({
            ip_address,
            fingerprint,
            reason: `Auto-blacklisted: ${type} (${severity} severity)`,
            // Default expiry of 30 days for aggressive security
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
      }
    }

    return new Response(JSON.stringify({ success: true, ip: ip_address }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error reporting incident:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
