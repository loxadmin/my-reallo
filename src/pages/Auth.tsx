import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, UserPlus, LogIn, Gift, ArrowRight } from "lucide-react";
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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-background">
      {/* Dynamic Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] z-10 space-y-8"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-4 rounded-3xl glass-pill mb-2"
          >
            <RealloEyeLogo size={48} className="text-primary" />
          </motion.div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              Reallo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reclaim what's yours
            </p>
          </div>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center py-10 space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground">Check Your Email</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've sent a confirmation link to <span className="text-foreground font-bold">{email}</span>. Click the link to activate your account.
              </p>
            </div>
            <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }} className="w-full py-4 border-white/10">
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Mode Switcher */}
            <div className="flex p-1.5 glass rounded-2xl border border-white/5 bg-white/[0.02]">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-3 rounded-xl font-display text-sm font-medium transition-all duration-500 relative ${
                    mode === m ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-primary rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {m === "login" ? <LogIn size={14} /> : <UserPlus size={14} />}
                    {m === "login" ? "Login" : "Sign Up"}
                  </span>
                </button>
              ))}
            </div>

            <GlassCard variant="glow" className="p-1">
              <div className="p-6 space-y-5">
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
                        className="space-y-4"
                      >
                        <GlassInput
                          label="Referral Code (optional)"
                          placeholder="e.g. AB12CD34"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                        />
                        <div className="mt-2 flex items-center gap-2 px-1">
                           <Gift size={12} className="text-primary" />
                           <span className="text-xs text-primary/60">
                             You and your referrer both benefit
                           </span>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive font-display text-center"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="pt-2">
                      <GlassButton
                        variant="primary"
                        className="w-full py-4 clay-primary text-base font-semibold flex items-center justify-center gap-2 group"
                        onClick={handleSubmit}
                        disabled={loading || !email || !password}
                      >
                        {loading ? "Please wait..." : (
                          <>
                            {mode === "login" ? "Sign In" : "Create Account"}
                          </>
                        )}
                      </GlassButton>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
