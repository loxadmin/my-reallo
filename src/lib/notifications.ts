import { supabase } from "@/integrations/supabase/client";

const EMAIL_EVENTS = new Set([
  "ban", "warning", "approval", "rejection", "off_queue", "earning", "challenge_complete",
  "influencer_approved", "influencer_rejected", "wallet_activated", "withdrawal_approved", "withdrawal_rejected",
  "spend_verified",
]);

export const sendNotification = async (params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  sendEmail?: boolean;
}) => {
  const { userId, type, title, message, sendEmail } = params;

  // Create in-app notification
  await supabase.from("notifications" as any).insert({
    user_id: userId,
    type,
    title,
    message,
  } as any);

  // Send email for important events
  if (sendEmail !== false && EMAIL_EVENTS.has(type)) {
    try {
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
      if (profile?.email) {
        await supabase.functions.invoke("send-notification-email", {
          body: { to: profile.email, subject: title, body: message },
        });
      }
    } catch (err) {
      console.error("Failed to send email notification:", err);
    }
  }
};
