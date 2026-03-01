import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, ArrowRight } from "lucide-react";
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
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-2"
          >
            <RealloEyeLogo size={48} />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome to <span className="gradient-text">Reallo</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Reclaim what's yours</p>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center p-8 sm:p-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
            <GlassButton variant="outline" className="w-full" onClick={() => { setSignupSuccess(false); setMode("login"); }}>
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <GlassCard variant="glow" className="p-2">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/20 rounded-2xl mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="px-4 pb-6 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
                  transition={{ duration: 0.2 }}
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
                    >
                      <GlassInput
                        label="Referral Code (optional)"
                        placeholder="e.g. AB12CD34"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                      />
                    </motion.div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-destructive font-display font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20"
                    >
                      {error}
                    </motion.p>
                  )}

                  <GlassButton
                    variant="primary"
                    className="w-full mt-2 text-base py-4"
                    onClick={handleSubmit}
                    disabled={loading || !email || !password}
                  >
                    {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                    {!loading && <ArrowRight className="inline w-4 h-4 ml-2" />}
                  </GlassButton>
                </motion.div>
              </AnimatePresence>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
