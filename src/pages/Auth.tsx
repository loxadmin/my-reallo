import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift } from "lucide-react";

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
      else navigate("/");
    } else {
      const { error } = await signUp(email, password, referralCode || undefined);
      if (error) setError(error.message);
      else setSignupSuccess(true);
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold gradient-text mb-2">Reallo</h1>
          <p className="text-sm text-muted-foreground">Reclaim what's yours</p>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
            <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }}>
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <GlassCard variant="glow">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-xl font-display text-sm font-medium transition-all duration-300 ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "glass-button text-muted-foreground"
                }`}
              >
                <LogIn className="inline w-4 h-4 mr-1.5" />
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-xl font-display text-sm font-medium transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "glass-button text-muted-foreground"
                }`}
              >
                <UserPlus className="inline w-4 h-4 mr-1.5" />
                Sign Up
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
                <GlassInput
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <GlassInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <GlassInput
                      label="Referral Code (optional)"
                      placeholder="e.g. AB12CD34"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                    <p className="text-xs text-primary/60 mt-1 flex items-center gap-1">
                      <Gift className="w-3 h-3" /> You and your referrer both benefit
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-destructive font-display"
                  >
                    {error}
                  </motion.p>
                )}

                <GlassButton
                  variant="primary"
                  className="w-full mt-4 text-base py-3.5"
                  onClick={handleSubmit}
                  disabled={loading || !email || !password}
                >
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
