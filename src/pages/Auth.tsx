import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, ChevronRight, ShieldCheck, Zap } from "lucide-react";
import RealloEyeLogo from "@/components/RealloEyeLogo";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-fill referral code from URL and switch to signup mode
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setMode("signup");
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/dashboard");
    } else {
      const { error } = await signUp(email, password, referralCode || undefined);
      if (error) setError(error.message);
      else setSignupSuccess(true);
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Dynamic background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 space-y-8"
      >
        {/* Logo and Greeting */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="p-3 rounded-2xl glass border-primary/20 bg-primary/5">
              <RealloEyeLogo size={48} />
            </div>
            <h1 className="font-display text-4xl font-bold gradient-text tracking-tighter">
              Reallo
            </h1>
          </motion.div>
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-foreground">
              {mode === "login" ? "Welcome Back" : "Join the Queue"}
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              {mode === "login"
                ? "Enter your details to manage your reclaims"
                : "Create an account to start reclaiming your spend"}
            </p>
          </div>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center space-y-6 py-10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto pulse-glow">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground">Verify Your Email</h2>
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                We've sent a link to <strong className="text-foreground">{email}</strong>.
                Confirm your email to activate your account.
              </p>
            </div>
            <GlassButton
              variant="primary"
              onClick={() => { setSignupSuccess(false); setMode("login"); }}
              className="w-full"
            >
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <GlassCard variant="glow" className="space-y-6 p-8">
              {/* Form Fields */}
              <div className="space-y-4">
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4 text-primary/60" />}
                />
                <GlassInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4 text-primary/60" />}
                />

                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <GlassInput
                      label="Referral Code (Optional)"
                      placeholder="e.g. ABC-123"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      icon={<Gift className="w-4 h-4 text-primary/60" />}
                    />
                    <div className="flex items-center gap-2 px-1">
                      <Zap className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-display font-bold text-primary uppercase tracking-widest">
                        Instantly skip 5 spots
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-destructive font-display font-bold text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email || !password}
                className="clay-primary w-full py-5 rounded-2xl flex items-center justify-center gap-2 group text-base"
              >
                {loading ? "Processing..." : mode === "login" ? "Sign In" : "Start Reclaiming"}
                {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </GlassCard>

            {/* Toggle Mode */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">
                {mode === "login" ? "New to Reallo?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-display font-bold hover:underline underline-offset-4"
                >
                  {mode === "login" ? "Join the Queue" : "Sign In"}
                </button>
              </p>
            </div>

            {/* Footer Trust */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-primary/10">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/60" />
                SSL Encrypted
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest">
                <Zap className="w-3.5 h-3.5 text-primary/60" />
                Live Tracking
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
