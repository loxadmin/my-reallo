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

    // Move all users up 10 positions daily
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, queue_position")
      .gt("queue_position", 1)
      .order("queue_position", { ascending: true });

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const newPos = Math.max(1, profile.queue_position - 10);
        await supabase
          .from("profiles")
          .update({ queue_position: newPos })
          .eq("id", profile.id);

        await supabase.from("waitlist_activity").insert({
          user_id: profile.id,
          action_type: "auto_move",
          positions_moved: profile.queue_position - newPos,
        });
      }
    }

    // Remove 10 ghost users from the front
    const { data: ghosts } = await supabase
      .from("ghost_users")
      .select("id")
      .order("position", { ascending: true })
      .limit(10);

    if (ghosts && ghosts.length > 0) {
      const ids = ghosts.map((g: any) => g.id);
      await supabase.from("ghost_users").delete().in("id", ids);
    }

    return new Response(
      JSON.stringify({ success: true, processed: profiles?.length || 0, ghosts_removed: ghosts?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
