import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Karbali — a warm, sharp, conversational assistant for Karbali (a fintech platform that helps Nigerians reclaim money they spend on data, electricity, food, and transport).

PERSONALITY:
- Friendly, Nigerian-casual tone. Use light emoji. Be encouraging but not over-the-top.
- You're like a smart friend who genuinely wants to help people save money.
- Keep responses concise (2-4 sentences max unless explaining something complex).
- Use Naira (₦) for all currency references.

PLATFORM CONTEXT:
- Users join a waitlist queue. 50 people advance daily. Referring a friend skips 20 positions.
- Once off the queue, users can verify their spend and claim vouchers.
- Points system: 1 point = ₦0.50. Minimum 100,000 points (₦50,000) to claim.
- 6-month maturity period after getting off queue before claiming.
- Users set savings goals: Education, Vacation, Business Funding, or Rent Support.

YOUR CAPABILITIES:
1. ONBOARDING: If the user hasn't set up their spend profile, guide them through it conversationally:
   - Ask about weekly data spend, monthly electricity, weekly food, weekly transport
   - Extract amounts naturally from conversation (e.g., "about 5k" = ₦5,000)
   - Help them pick a goal
   - When you have all 4 spend amounts AND a goal, output a JSON block to save:
     \`\`\`karbali-save
     {"annual_data_spend": X, "annual_electricity_spend": X, "annual_food_spend": X, "annual_transport_spend": X, "total_annual_spend": X, "selected_goal": "education|vacation|business|rent"}
     \`\`\`

2. GENERAL CONVERSATION: Have real conversations. If someone says "I want to travel", engage naturally — ask where, discuss their plans, timing, budget, and motivation before tying it back to how Karbali can help fund that goal.

3. EDUCATION & CONVERSION: Explain how Karbali works, why brands should give back, how to earn points, referral benefits, etc. Be a conversion engine — help users understand the value.

4. PROACTIVE SUGGESTIONS: When appropriate, suggest actions:
   - "Did you know you can skip 20 queue positions by referring one friend?"
   - "Have you checked out the Earn tab? There are tasks waiting for you."
   - "You can verify your spend in the Verify section once you're off the queue."

6. GOAL DISCOVERY & HANDOFF:
   - When users reveal what they want (travel, school, rent help, business plans), explore it naturally first.
   - Reflect their goal back to them in plain language.
   - Ask if they want to keep chatting or go to their dashboard.
   - Only output a karbali-navigate block if the user clearly wants to navigate.

5. DASHBOARD NAVIGATION: If a user wants to go to their dashboard or a specific section, output:
   \`\`\`karbali-navigate
   {"route": "home|earn|verify|influencer|notifications"}
   \`\`\`

RULES:
- Never fabricate information about the user's account. Use the profile data provided.
- If you don't know something specific about the platform, say so honestly.
- Don't output karbali-save unless you have ALL required fields confirmed by the user.
- For amounts, always calculate annual values: weekly * 52, monthly * 12.
- Keep the conversation flowing — don't rush through onboarding unless the user wants to.
- Never abruptly end or close the chat. Keep talking until the user wants to stop, save, or navigate.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context from profile
    let profileContext = "";
    if (profile) {
      const parts = [];
      if (profile.email) parts.push(`User email: ${profile.email}`);
      if (profile.queue_position !== undefined) parts.push(`Queue position: ${profile.queue_position <= 0 ? "OFF QUEUE ✓" : `#${profile.queue_position}`}`);
      if (profile.points_balance !== undefined) parts.push(`Points: ${profile.points_balance}`);
      if (profile.total_annual_spend) parts.push(`Total annual spend: ₦${profile.total_annual_spend?.toLocaleString()}`);
      if (profile.selected_goal) parts.push(`Goal: ${profile.selected_goal}`);
      if (profile.referral_code) parts.push(`Referral code: ${profile.referral_code}`);
      if (profile.annual_data_spend) parts.push(`Annual data: ₦${profile.annual_data_spend?.toLocaleString()}`);
      if (profile.annual_electricity_spend) parts.push(`Annual electricity: ₦${profile.annual_electricity_spend?.toLocaleString()}`);
      if (profile.annual_food_spend) parts.push(`Annual food: ₦${profile.annual_food_spend?.toLocaleString()}`);
      if (profile.annual_transport_spend) parts.push(`Annual transport: ₦${profile.annual_transport_spend?.toLocaleString()}`);
      if (profile.off_queue_at) parts.push(`Off queue since: ${profile.off_queue_at}`);

      const needsOnboarding = !profile.selected_goal || !profile.total_annual_spend || profile.total_annual_spend === 0;
      if (needsOnboarding) {
        parts.push("STATUS: User has NOT completed onboarding. Guide them through spend setup and goal selection conversationally.");
      } else {
        parts.push("STATUS: User has completed onboarding. Help with general questions, tips, and navigation.");
      }

      profileContext = `\n\nUSER PROFILE:\n${parts.join("\n")}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + profileContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
