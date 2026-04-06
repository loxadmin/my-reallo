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

    console.log(`Starting deletion for user: ${user_id}`);

    // Define all table deletions in correct order (dependents first)
    // 1. Tables referencing profiles but maybe missing ON DELETE CASCADE
    const cleanupTasks = [
      { table: "verification_transactions", column: "user_id" },
      { table: "spend_verifications", column: "user_id" },
      { table: "vouchers", column: "user_id" },
      { table: "questionnaire_responses", column: "user_id" },
      { table: "influencer_wallet_transactions", column: "user_id" },
      { table: "influencer_survey_responses", column: "user_id" },
      { table: "influencer_challenge_submissions", column: "user_id" },
      { table: "influencer_challenge_enrollments", column: "user_id" },
      { table: "influencer_withdrawals", column: "user_id" },
      { table: "influencer_referrals", column: "influencer_id" },
      { table: "influencer_referrals", column: "referred_user_id" },
      { table: "influencer_bank_accounts", column: "user_id" },
      { table: "influencer_wallets", column: "user_id" },
      { table: "influencer_applications", column: "user_id" },
      { table: "advertiser_tokens", column: "created_by" },
      { table: "signup_devices", column: "user_id" },
      { table: "user_warnings", column: "user_id" },
      { table: "user_warnings", column: "issued_by" },
      { table: "notifications", column: "user_id" },
      { table: "waitlist_activity", column: "user_id" },
      { table: "decision_responses", column: "user_id" },
      { table: "survey_responses", column: "user_id" },
      { table: "referrals", column: "referrer_id" },
      { table: "referrals", column: "referred_user_id" },
    ];

    for (const task of cleanupTasks) {
      console.log(`Cleaning up ${task.table} for ${task.column}=${user_id}`);
      const { error } = await adminClient.from(task.table).delete().eq(task.column, user_id);
      if (error) {
        console.error(`Error deleting from ${task.table}:`, error);
        // We continue even if some fail, but log it
      }
    }

    // 2. Clear self-references in profiles (referred_by)
    console.log(`Clearing referred_by for users referred by ${user_id}`);
    await adminClient.from("profiles").update({ referred_by: null }).eq("referred_by", user_id);

    // 3. Delete from user_roles
    console.log(`Deleting user_roles for ${user_id}`);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);

    // 4. Delete from profiles (main profile)
    console.log(`Deleting profile for ${user_id}`);
    const { error: profileError } = await adminClient.from("profiles").delete().eq("id", user_id);
    if (profileError) {
        console.error("Error deleting profile:", profileError);
        return new Response(JSON.stringify({ error: `Failed to delete profile: ${profileError.message}` }), { status: 500, headers: corsHeaders });
    }

    // 5. Delete from auth.users last
    console.log(`Deleting auth user for ${user_id}`);
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error("Error deleting auth user:", authError);
      return new Response(JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }), { status: 500, headers: corsHeaders });
    }

    console.log(`Successfully deleted user ${user_id}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in admin-delete-user:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
