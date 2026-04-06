import { supabase } from "@/integrations/supabase/client";

interface ErrorData {
  message: string;
  stack?: string;
  user_id?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export const logError = async (data: ErrorData) => {
  try {
    const { error } = await supabase.from("system_errors").insert({
      message: data.message,
      stack: data.stack || null,
      user_id: data.user_id || (await supabase.auth.getSession()).data.session?.user.id || null,
      url: data.url || window.location.href,
      metadata: data.metadata || {},
    });

    if (error) {
      console.error("Failed to log error to Supabase:", error);
    }
  } catch (err) {
    console.error("Error in logError utility:", err);
  }
};
