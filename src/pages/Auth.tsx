import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import KarbaliLogo from "@/components/KarbaliLogo";
import WaterBackground from "@/components/WaterBackground";
import {
  loginSchema,
  signupSchema,
  sanitizeAuthError,
  getPasswordStrength,
  GENERIC_AUTH_ERROR,
} from "@/lib/security";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { triggerTrap, detectMaliciousPatterns } from "@/lib/securityTraps";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedEmailDomain, getBlockedDomainMessage } from "@/lib/emailValidation";

const REFERRAL_STORAGE_KEY = "karbali_pending_referral";

const AuthSkeleton = ({ onlyGoogleAuth }: { onlyGoogleAuth: boolean }) => (
  <div className="space-y-6 w-full animate-pulse">
    {!onlyGoogleAuth ? (
      <>
        <div className="flex gap-2 mb-6">
          <div className="h-10 flex-1 rounded-xl bg-muted/20" />
          <div className="h-10 flex-1 rounded-xl bg-muted/20" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-12 rounded bg-muted/20" />
            <div className="h-11 w-full rounded-xl bg-muted/20" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted/20" />
            <div className="h-11 w-full rounded-xl bg-muted/20" />
          </div>
        </div>
        <div className="h-12 w-full rounded-xl bg-muted/20 mt-6" />
        <div className="h-12 w-full rounded-xl bg-muted/20 mt-4" />
      </>
    ) : (
      <div className="flex flex-col items-center py-4">
        <div className="h-7 w-48 rounded bg-muted/20 mb-3" />
        <div className="h-4 w-64 rounded bg-muted/20 mb-8" />
        <div className="h-12 w-full rounded-2xl bg-muted/20" />
      </div>
    )}
  </div>
);

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hpValue, setHpValue] = useState(""); // Honeypot value
  const [referralCode, setReferralCode] = useState("");
  const [userType, setUserType] = useState<"student" | "parent" | "others" | "">("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [onlyGoogleAuth, setOnlyGoogleAuth] = useState(localStorage.getItem("karbali_only_google_auth") === "true");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "only_google_auth")
          .maybeSingle();

        if (!error && data) {
          const isOnlyGoogle = data.value === "true";
          setOnlyGoogleAuth(isOnlyGoogle);
          localStorage.setItem("karbali_only_google_auth", String(isOnlyGoogle));
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    };

    void fetchSettings();

    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
      setMode("signup");
    }
  }, [searchParams]);

  // Handle post-OAuth referral processing without introducing another auth state source
  useEffect(() => {
    let cancelled = false;

    const processOAuthRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      const pendingRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (pendingRef) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        try {
          const deviceFp = getDeviceFingerprint();
          await supabase.functions.invoke("handle-google-referral", {
            body: { referral_code: pendingRef, device_fingerprint: deviceFp },
          });
        } catch {
          // Non-critical
        }
      }
      navigate("/dashboard", { replace: true });
    };

    void processOAuthRedirect();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : null;

  const handleGoogleSignIn = async () => {
    // Store referral code before redirecting to Google
    if (referralCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode.toUpperCase());
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) setError(sanitizeAuthError(error));
  };

  const handleSubmit = async () => {
    // If honeypot is filled, trigger trap
    if (hpValue) {
      await triggerTrap("honeypot_triggered", { field: "hp_email" }, "critical", true);
      return;
    }

    // Detect SQL injection or XSS in inputs
    if (detectMaliciousPatterns(email) || detectMaliciousPatterns(password)) {
      await triggerTrap("malicious_input", {
        email: email.substring(0, 50), // Log only first part for safety
        reason: "SQLi or XSS pattern detected in auth fields"
      }, "critical", true);
      return;
    }

    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      // Block non-recognized email domains
      if (!isAllowedEmailDomain(email)) {
        setError(getBlockedDomainMessage());
        setLoading(false);
        return;
      }

      if (mode === "login") {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.errors.forEach((e) => {
            errs[e.path[0] as string] = e.message;
          });
          setFieldErrors(errs);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) setError(sanitizeAuthError(error));
        else navigate("/dashboard");
      } else {
        // Validate user type selection
        if (!userType) {
          setFieldErrors({ userType: "Please select your user type" });
          setLoading(false);
          return;
        }

        const result = signupSchema.safeParse({
          email,
          password,
          referralCode: referralCode || undefined,
        });
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.errors.forEach((e) => {
            errs[e.path[0] as string] = e.message;
          });
          setFieldErrors(errs);
          setLoading(false);
          return;
        }

        // Check device/IP signup limit before proceeding
        const deviceFp = getDeviceFingerprint();
        try {
          const { data: limitCheck, error: limitError } = await supabase.functions.invoke(
            "check-signup-limit",
            { body: { action: "check", device_fingerprint: deviceFp } }
          );
          if (limitError) throw limitError;
          if (!limitCheck?.allowed) {
            setError("Too many accounts created from this device or network. Maximum 2 accounts allowed.");
            setLoading(false);
            return;
          }
        } catch {
          // If check fails, allow signup to proceed (fail-open for UX)
        }

        const { data: signUpData, error: signUpError } = await signUp(email, password, referralCode || undefined);
        if (signUpError) {
          setError(sanitizeAuthError(signUpError));
        } else {
          const userId = signUpData?.user?.id;
          // Register this device/IP and save user_type after successful signup
          try {
            if (userId) {
              await Promise.all([
                supabase.functions.invoke("check-signup-limit", {
                  body: { action: "register", device_fingerprint: deviceFp, user_id: userId },
                }),
                supabase.from("profiles").update({ user_type: userType }).eq("id", userId),
              ]);
            }
          } catch {
            // Non-critical, don't block signup success
          }
          setSignupSuccess(true);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-24 overflow-x-hidden overflow-y-auto">
      <WaterBackground />
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <KarbaliLogo size={28} />
            <h1 className="font-display text-xl font-bold gradient-text">Karbali</h1>
          </div>
          <p className="text-[13px] text-muted-foreground">Your Financial Assistant</p>
        </div>

        <GlassCard variant="glow" className="min-h-[420px] flex flex-col items-stretch overflow-hidden">
          <AnimatePresence mode="wait">
            {loadingSettings ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-center py-4"
              >
                <AuthSkeleton onlyGoogleAuth={onlyGoogleAuth} />
              </motion.div>
            ) : forgotMode ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {forgotSent ? (
                  <div className="text-center py-4">
                    <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">Check Your Email</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
                    </p>
                    <GlassButton variant="outline" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                      Back to Login
                    </GlassButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="font-display text-lg font-bold text-foreground text-center">Reset Password</h2>
                    <p className="text-sm text-muted-foreground text-center">Enter your email and we'll send you a reset link.</p>
                    <GlassInput
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                    {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                    <GlassButton
                      variant="primary"
                      className="w-full py-3.5"
                      disabled={forgotLoading || !email}
                      onClick={async () => {
                        setError("");
                        setForgotLoading(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) setError(error.message);
                        else setForgotSent(true);
                        setForgotLoading(false);
                      }}
                    >
                      {forgotLoading ? "Sending…" : "Send Reset Link"}
                    </GlassButton>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(false); setError(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground w-full text-center mt-2"
                    >
                      ← Back to Login
                    </button>
                  </div>
                )}
              </motion.div>
            ) : signupSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4"
              >
                <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
                <h2 className="font-display text-lg font-bold text-foreground mb-2">Check Your Email</h2>
                <p className="text-[13px] text-muted-foreground mb-6">
                  We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
                  Click the link to activate your account.
                </p>
                <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }}>
                  Back to Login
                </GlassButton>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {!onlyGoogleAuth && (
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => { setMode("login"); setError(""); setFieldErrors({}); }}
                      className={`flex-1 py-2.5 rounded-xl font-display text-[13px] font-medium transition-all duration-300 ${
                        mode === "login" ? "clay-primary text-primary-foreground" : "glass-button text-muted-foreground"
                      }`}
                    >
                      <LogIn className="inline w-4 h-4 mr-1.5" /> Login
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); setFieldErrors({}); }}
                      className={`flex-1 py-2.5 rounded-xl font-display text-[13px] font-medium transition-all duration-300 ${
                        mode === "signup" ? "clay-primary text-primary-foreground" : "glass-button text-muted-foreground"
                      }`}
                    >
                      <UserPlus className="inline w-4 h-4 mr-1.5" /> Sign Up
                    </button>
                  </div>
                )}

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit();
                  }}
                >
                  {!onlyGoogleAuth ? (
                    <>
                      {/* Honeypot field - hidden from humans */}
                      <div style={{ position: "absolute", opacity: 0, zIndex: -1, pointerEvents: "none" }}>
                        <input
                          type="text"
                          name="hp_email"
                          value={hpValue}
                          onChange={(e) => setHpValue(e.target.value)}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <GlassInput
                          label="Email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                        />
                        {fieldErrors.email && (
                          <p className="text-[11px] text-destructive mt-1">{fieldErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <div className="relative">
                          <GlassInput
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-[11px] text-destructive mt-1">{fieldErrors.password}</p>
                        )}
                        {mode === "signup" && password.length > 0 && passwordStrength && (
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-1">
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                                  style={{
                                    backgroundColor:
                                      i <= passwordStrength.score
                                        ? passwordStrength.color
                                        : "hsl(var(--muted))",
                                  }}
                                />
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      <div className={`grid transition-all duration-300 ease-in-out ${mode === "signup" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <div className="pt-1 space-y-3">
                            {/* Parent / Student selector */}
                            <div>
                              <label className="text-[12px] font-medium text-foreground mb-1.5 block">I am a</label>
                              <div className="flex gap-2">
                                {(["student", "parent", "others"] as const).map(type => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setUserType(type)}
                                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 border ${
                                      userType === type
                                        ? "clay-primary text-primary-foreground border-primary/30"
                                        : "glass-button text-muted-foreground border-border/40"
                                    }`}
                                  >
                                    {type === "student" ? "🎓 Student" : type === "parent" ? "👨‍👩‍👧 Parent" : "🌟 Others"}
                                  </button>
                                ))}
                              </div>
                              {fieldErrors.userType && <p className="text-[11px] text-destructive mt-1">{fieldErrors.userType}</p>}
                            </div>
                            <GlassInput label="Referral Code (optional)" placeholder="e.g. AB12CD34" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                            <p className="text-[11px] text-primary/60 mt-1 flex items-center gap-1">
                              <Gift className="w-3 h-3" /> You and your referrer both benefit
                            </p>
                          </div>
                        </div>
                      </div>

                      {error && (
                        <p className="text-[13px] text-destructive font-medium">
                          {error}
                        </p>
                      )}

                      {mode === "login" && !forgotMode && (
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setError(""); }}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Forgot password?
                        </button>
                      )}

                      <GlassButton variant="primary" type="submit" className="w-full mt-4 text-[13px] py-3.5" disabled={loading || !email || !password}>
                        {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                      </GlassButton>

                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/40" />
                        </div>
                        <div className="relative flex justify-center text-[11px]">
                          <span className="bg-card px-3 text-muted-foreground">or continue with</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <h2 className="font-display text-lg font-bold text-foreground mb-2">Sign in to continue</h2>
                      <p className="text-[13px] text-muted-foreground mb-6">Access your account securely with Google</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl glass-button text-foreground font-display text-[13px] font-medium transition-all duration-300 hover:scale-[1.02]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Auth;
