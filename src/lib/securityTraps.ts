import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "./fingerprint";

export type IncidentType =
  | "devtools_detected"
  | "honeypot_triggered"
  | "right_click_attempt"
  | "malicious_input"
  | "unauthorized_admin_access"
  | "forced_navigation_attempt";

export const REDIRECT_URL = "https://www.google.com/search?q=how+to+be+a+better+person";

/**
 * Common SQL injection and XSS patterns for detection
 * Relaxed to avoid false positives for normal user names/emails
 */
const MALICIOUS_PATTERNS = [
  // SQL: Only more definitive sequences, removed lone quotes and double-dash
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // SQL: 'or'
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // SQL: = with sequences
  /<script[^>]*>/i, // XSS: script tag
  /<\/script>/i, // XSS: script end tag
  /\bon\w+\s*=/i, // XSS: any event handler pattern
  /javascript\s*:/i, // XSS: javascript protocol
];

/**
 * Detect malicious strings (SQLi, XSS) in user input
 */
export function detectMaliciousPatterns(input: string): boolean {
  if (!input) return false;
  return MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Counter-attack payload - DISABLED to protect normal users
 */
function launchCounterAttack() {
  // Disabled
  console.warn("Security counter-attack is disabled.");
}

/**
 * Report a security incident to the backend.
 * Automatic redirection has been disabled for better user experience.
 */
export async function triggerTrap(
  type: IncidentType,
  details: any = {},
  severity: "low" | "medium" | "high" | "critical" = "high",
  shouldRedirect: boolean = false // Default changed to false
) {
  const fingerprint = getDeviceFingerprint();

  try {
    // Fire and forget reporting
    await supabase.functions.invoke("report-incident", {
      body: {
        type,
        details: {
          ...details,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        },
        fingerprint,
        severity
      }
    });
  } catch (error) {
    console.error("Failed to report incident:", error);
  }

  // Automatic redirects and counter-attacks removed to prevent affecting normal users
  if (severity === "critical") {
    console.warn("Critical security incident reported:", type);
  }
}

/**
 * Check if the current device/fingerprint is blacklisted.
 * Automatic redirection has been disabled.
 */
export async function checkBlacklist(): Promise<boolean> {
  const fingerprint = getDeviceFingerprint();

  try {
    const { data, error } = await (supabase as any)
      .rpc("check_is_blacklisted", { client_fingerprint: fingerprint });

    if (error) {
      console.error("Error checking blacklist:", error);
      return false;
    }

    if (data === true) {
      console.warn("Device fingerprint is blacklisted.");
      return true;
    }
  } catch (err) {
    console.error("Blacklist check failed:", err);
  }

  return false;
}
