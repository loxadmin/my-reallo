import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin using their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: corsHeaders });
    }

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: corsHeaders });
    }

    // Delete profile and related data (cascades handle most)
    // Delete from profiles first
    await adminClient.from("profiles").delete().eq("id", user_id);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("notifications").delete().eq("user_id", user_id);
    await adminClient.from("waitlist_activity").delete().eq("user_id", user_id);
    await adminClient.from("referrals").delete().or(`referrer_id.eq.${user_id},referred_user_id.eq.${user_id}`);
    await adminClient.from("decision_responses").delete().eq("user_id", user_id);
    await adminClient.from("questionnaire_responses").delete().eq("user_id", user_id);
    await adminClient.from("spend_verifications").delete().eq("user_id", user_id);
    await adminClient.from("verification_transactions").delete().eq("user_id", user_id);
    await adminClient.from("vouchers").delete().eq("user_id", user_id);
    await adminClient.from("survey_responses").delete().eq("user_id", user_id);
    await adminClient.from("signup_devices").delete().eq("user_id", user_id);
    await adminClient.from("user_warnings").delete().eq("user_id", user_id);

    // Delete from auth.users last
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
