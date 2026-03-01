import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, ArrowRight, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
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
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Identity */}
        <div className="text-center mb-10 space-y-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-4 rounded-[2rem] bg-primary/10 mb-2 border border-primary/20 shadow-inner shadow-primary/10"
          >
            <RealloEyeLogo size={48} />
          </motion.div>
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Reallo</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1">Reclaim your utility spend</p>
          </div>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center p-10 border-primary/20">
            <div className="w-16 h-16 rounded-3xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">Verify Your Identity</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed font-medium">
              We've dispatched a secure link to <strong className="text-foreground">{email}</strong>.
              Please authenticate your email to activate your account.
            </p>
            <GlassButton variant="outline" className="w-full py-4 rounded-2xl font-bold" onClick={() => { setSignupSuccess(false); setMode("login"); }}>
              Return to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <GlassCard variant="glow" className="p-8 border-primary/20 bg-primary/5">
              {/* Mode Switcher */}
              <div className="flex p-1.5 bg-muted/40 backdrop-blur-md rounded-2xl mb-8 border border-border/10">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-500 flex items-center justify-center gap-2 ${
                    mode === "login"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-3 rounded-xl font-display text-sm font-bold transition-all duration-500 flex items-center justify-center gap-2 ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
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
                  initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="space-y-4">
                    <GlassInput
                      label="Email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-2xl"
                    />
                    <GlassInput
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-2xl"
                    />

                    {mode === "signup" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-1"
                      >
                        <GlassInput
                          label="Referral Code (Optional)"
                          placeholder="Enter code"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                          className="rounded-2xl"
                        />
                        <div className="flex items-center gap-2 mt-3 px-1">
                           <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-primary" />
                           </div>
                           <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                             Move up 5 spots with a referral
                           </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  <GlassButton
                    variant="primary"
                    className="w-full py-5 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 group mt-4"
                    onClick={handleSubmit}
                    disabled={loading || !email || !password}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                         <RefreshCw className="w-5 h-5 animate-spin" /> Loading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </GlassButton>
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
               <ShieldCheck className="w-3.5 h-3.5" />
               Secured via Supabase Infrastructure
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
