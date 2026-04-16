import { supabase } from "@/integrations/supabase/client";
import { isMissingRelationError } from "@/lib/supabaseErrorGuards";

interface ErrorData {
  message: string;
  stack?: string;
  user_id?: string;
  url?: string;
  metadata?: Record<string, any>;
}

const SYSTEM_ERRORS_DISABLED_KEY = "karbali.system_errors_table_unavailable";
let isSystemErrorsTableUnavailable =
  typeof window !== "undefined" && window.localStorage.getItem(SYSTEM_ERRORS_DISABLED_KEY) === "true";

export const logError = async (data: ErrorData) => {
  if (isSystemErrorsTableUnavailable) return;

  try {
    const { error } = await supabase.from("system_errors").insert({
      message: data.message,
      stack: data.stack || null,
      user_id: data.user_id || (await supabase.auth.getSession()).data.session?.user.id || null,
      url: data.url || window.location.href,
      metadata: data.metadata || {},
    });

    if (error) {
      if (isMissingRelationError(error, "system_errors")) {
        isSystemErrorsTableUnavailable = true;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SYSTEM_ERRORS_DISABLED_KEY, "true");
        }
        return;
      }

      console.error("Failed to log error to Supabase:", error);
    }
  } catch (err) {
    console.error("Error in logError utility:", err);
  }
};
