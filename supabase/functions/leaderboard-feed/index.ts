import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mask(email: string): string {
  const username = email?.split("@")[0] || "User";
  return username.length > 3
    ? username.slice(0, 2) + "***" + username.slice(-1)
    : username.slice(0, 1) + "***";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const entries: { id: string; label: string; amount: number; action: string }[] = [];

  // 1. Top savers (claimable points value)
  const { data: savers } = await supabase
    .from("profiles")
    .select("id, email, points_balance")
    .gt("points_balance", 0)
    .order("points_balance", { ascending: false })
    .limit(10);

  for (const p of savers || []) {
    const claimable = Math.floor((p.points_balance || 0) * 0.5);
    if (claimable > 0) {
      entries.push({ id: `saver-${p.id}`, label: mask(p.email), amount: claimable, action: "saved" });
    }
  }

  // 2. Approved influencer withdrawals
  const { data: withdrawals } = await supabase
    .from("influencer_withdrawals")
    .select("id, amount, user_id")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const w of withdrawals || []) {
    const { data: prof } = await supabase.from("profiles").select("email").eq("id", w.user_id).single();
    entries.push({ id: `withdraw-${w.id}`, label: mask(prof?.email || ""), amount: w.amount, action: "withdrew" });
  }

  // 3. Voucher claims
  const { data: vouchers } = await supabase
    .from("vouchers")
    .select("id, amount_naira, user_id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const v of vouchers || []) {
    const { data: prof } = await supabase.from("profiles").select("email").eq("id", v.user_id).single();
    entries.push({ id: `claim-${v.id}`, label: mask(prof?.email || ""), amount: Number(v.amount_naira), action: "claimed" });
  }

  // 4. Influencer challenge earnings (approved submissions)
  const { data: submissions } = await supabase
    .from("influencer_challenge_submissions")
    .select("id, user_id, challenge_id")
    .eq("status", "approved")
    .order("submitted_at", { ascending: false })
    .limit(10);

  for (const s of submissions || []) {
    const { data: challenge } = await supabase.from("influencer_challenges").select("reward_per_video").eq("id", s.challenge_id).single();
    const { data: prof } = await supabase.from("profiles").select("email").eq("id", s.user_id).single();
    entries.push({
      id: `earn-${s.id}`,
      label: mask(prof?.email || ""),
      amount: challenge?.reward_per_video || 3000,
      action: "earned",
    });
  }

  // 5. Influencer referral credits
  const { data: refCredits } = await supabase
    .from("influencer_referrals")
    .select("id, influencer_id, reward_amount")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const r of refCredits || []) {
    const { data: prof } = await supabase.from("profiles").select("email").eq("id", r.influencer_id).single();
    entries.push({
      id: `ref-${r.id}`,
      label: mask(prof?.email || ""),
      amount: r.reward_amount,
      action: "earned from referral",
    });
  }

  // Shuffle/interleave by type
  const byAction: Record<string, typeof entries> = {};
  for (const e of entries) {
    (byAction[e.action] ??= []).push(e);
  }
  const groups = Object.values(byAction);
  const merged: typeof entries = [];
  const maxLen = Math.max(...groups.map((g) => g.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const g of groups) {
      if (i < g.length) merged.push(g[i]);
    }
  }

  return new Response(JSON.stringify(merged), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
