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
      navigate("/");
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
        else navigate("/");
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
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RealloLogo size={48} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            <span className="gradient-text">Reallo</span>
          </h1>
          <p className="text-[13px] text-muted-foreground">Reclaim what's yours</p>
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

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                transition={{ duration: 0.3 }}
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
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
