import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import RealloLogo from "@/components/RealloLogo";
import WaterBackground from "@/components/WaterBackground";
import {
  loginSchema,
  signupSchema,
  sanitizeAuthError,
  getPasswordStrength,
  GENERIC_AUTH_ERROR,
} from "@/lib/security";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { supabase } from "@/integrations/supabase/client";

const REFERRAL_STORAGE_KEY = "reallo_pending_referral";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
      setMode("signup");
    }
  }, [searchParams]);

  // Handle post-OAuth referral processing
  useEffect(() => {
    const processOAuthReferral = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
      navigate("/dashboard");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        processOAuthReferral();
      }
    });

    return () => subscription.unsubscribe();
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
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
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

        const { error: signUpError } = await signUp(email, password, referralCode || undefined);
        if (signUpError) {
          setError(sanitizeAuthError(signUpError));
        } else {
          // Register this device/IP after successful signup
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;
            if (userId) {
              await supabase.functions.invoke("check-signup-limit", {
                body: { action: "register", device_fingerprint: deviceFp, user_id: userId },
              });
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <WaterBackground />
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <RealloLogo size={28} />
            <h1 className="font-display text-xl font-bold gradient-text">Reallo</h1>
          </div>
          <p className="text-[12px] text-muted-foreground">Reclaim what's yours</p>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="font-display text-lg font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
            <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }}>
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <GlassCard variant="glow">
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

              <div
                key={mode}
                className="space-y-4"
              >
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

                {mode === "signup" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <GlassInput label="Referral Code (optional)" placeholder="e.g. AB12CD34" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                    <p className="text-[11px] text-primary/60 mt-1 flex items-center gap-1">
                      <Gift className="w-3 h-3" /> You and your referrer both benefit
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-destructive font-medium">
                    {error}
                  </motion.p>
                )}

                <GlassButton variant="primary" className="w-full mt-4 text-[13px] py-3.5" onClick={handleSubmit} disabled={loading || !email || !password}>
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
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
