import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, brand_name, dashboard_url } = await req.json();

    if (!email || !brand_name || !dashboard_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px;">
        <div style="background: #f8f9fa; border-radius: 12px; padding: 32px;">
          <h2 style="color: #1a1a1a; font-size: 20px; margin-top: 0; text-align: center;">REALLO — LOI Downloaded</h2>
          
          <p style="color: #333; font-size: 14px; line-height: 1.6;">
            Hi <strong>${brand_name}</strong>,
          </p>
          
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            You've successfully downloaded your Letter of Intent (LOI) PDF. Please keep a copy for your records.
          </p>

          <div style="background: #fff; border: 2px solid #0d4d3a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #333; font-size: 14px; margin: 0 0 12px 0; font-weight: bold;">📋 What's Next?</p>
            <ul style="color: #555; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Your LOI is currently being reviewed by the REALLO team.</li>
              <li>You can check your dashboard anytime to see if your account has been activated.</li>
              <li>Once REALLO reaches 100,000 verified users, you'll be notified about next steps.</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${dashboard_url}" style="display: inline-block; background: #0d4d3a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">
              View Your Dashboard
            </a>
          </div>

          <p style="color: #888; font-size: 12px; text-align: center; margin-bottom: 0;">
            You can sign in to your dashboard anytime using your verified email and a one-time code.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "REALLO <noreply@loxservices.pro>",
        to: email,
        subject: "REALLO — Your LOI Has Been Downloaded",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
