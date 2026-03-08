import { supabase } from "@/integrations/supabase/client";

// Events that should trigger email notifications
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
}) => {
  const { userId, type, title, message } = params;

  // Create in-app notification (email handled by Supabase's configured SMTP)
  await supabase.from("notifications" as any).insert({
    user_id: userId,
    type,
    title,
    message,
  } as any);
};
