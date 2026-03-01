import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift } from "lucide-react";
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
      {/* Aggressive glassmorphic background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex justify-center mb-4"
          >
            <RealloEyeLogo size={64} className="drop-shadow-[0_0_20px_hsla(var(--primary),0.3)]" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold gradient-text mb-2 tracking-tighter">
            Reallo
          </h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Reclaim what's yours</p>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center p-10 backdrop-blur-3xl border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">Check Your Email</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
            <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }} className="w-full">
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <GlassCard variant="glow" className="backdrop-blur-3xl border-white/10 shadow-2xl p-8">
            {/* Improved Tab Toggle */}
            <div className="flex p-1.5 glass rounded-2xl mb-8 border-white/5 shadow-inner">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-500 flex items-center justify-center gap-2 ${
                  mode === "login"
                    ? "clay-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-500 flex items-center justify-center gap-2 ${
                  mode === "signup"
                    ? "clay-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="space-y-5"
              >
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5"
                />
                <GlassInput
                  label="Security Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5"
                />

                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <GlassInput
                      label="Referral Code (optional)"
                      placeholder="e.g. AB12CD34"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="bg-white/5"
                    />
                    <p className="text-[11px] text-primary font-bold uppercase tracking-widest flex items-center gap-2 px-1">
                      <Gift className="w-3 h-3" /> Special Bonus for both of you
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                  >
                    <p className="text-xs text-destructive font-bold text-center">
                      {error}
                    </p>
                  </motion.div>
                )}

                <GlassButton
                  variant="primary"
                  className="w-full mt-6 text-base py-4 shadow-2xl"
                  onClick={handleSubmit}
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : mode === "login" ? "Welcome Back" : "Join the Queue"}
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
