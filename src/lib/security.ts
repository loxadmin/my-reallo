import { z } from "zod";

// ─── Password Validation (OWASP compliant) ───
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/\d/, "Must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Must contain at least one special character");

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(255, "Email must be less than 255 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  referralCode: z.string().max(20).optional(),
});

export const referralCodeSchema = z
  .string()
  .max(20, "Referral code too long")
  .regex(/^[A-Za-z0-9]*$/, "Referral code must be alphanumeric")
  .optional();

// ─── Generic error message to prevent user enumeration ───
export const GENERIC_AUTH_ERROR = "Invalid email or password";

export function sanitizeAuthError(error: { message: string }): string {
  const msg = error.message.toLowerCase();
  // Supabase returns specific messages that reveal user existence
  if (
    msg.includes("invalid login") ||
    msg.includes("email not confirmed") ||
    msg.includes("user not found") ||
    msg.includes("invalid credentials") ||
    msg.includes("wrong password")
  ) {
    return GENERIC_AUTH_ERROR;
  }
  if (msg.includes("email rate limit")) {
    return "Too many attempts. Please try again later.";
  }
  if (msg.includes("user already registered")) {
    // Don't reveal that the email exists
    return "If this email is available, a confirmation link has been sent.";
  }
  // For other errors, return as-is (e.g. network errors)
  return error.message;
}

// ─── Password strength indicator ───
export function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = [
    "hsl(var(--destructive))",
    "hsl(30, 100%, 50%)",
    "hsl(45, 100%, 50%)",
    "hsl(120, 60%, 45%)",
    "hsl(120, 80%, 35%)",
  ];

  return { score, label: labels[score], color: colors[score] };
}

// ─── 72-hour inactivity management ───
const INACTIVITY_KEY = "karbali-last-activity";
const MAX_INACTIVITY_MS = 72 * 60 * 60 * 1000; // 72 hours

export function updateLastActivity(): void {
  try {
    localStorage.setItem(INACTIVITY_KEY, Date.now().toString());
  } catch {
    // Storage full or unavailable
  }
}

export function isSessionExpiredByInactivity(): boolean {
  try {
    const last = localStorage.getItem(INACTIVITY_KEY);
    if (!last) return false; // First time, not expired
    const elapsed = Date.now() - parseInt(last, 10);
    return elapsed > MAX_INACTIVITY_MS;
  } catch {
    return false;
  }
}

export function clearActivityTimestamp(): void {
  try {
    localStorage.removeItem(INACTIVITY_KEY);
  } catch {
    // ignore
  }
}

// ─── Input sanitization ───
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
