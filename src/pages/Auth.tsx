import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift, ArrowLeft } from "lucide-react";
import RealloEyeLogo from "@/components/RealloEyeLogo";
import Navbar from "@/components/Navbar";

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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <RealloEyeLogo size={40} />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Enter your credentials to continue" : "Join the queue to reclaim your spend"}
          </p>
        </div>

        {signupSuccess ? (
          <GlassCard variant="glow" className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto pulse-glow">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display">Check Your Email</h2>
              <p className="text-sm text-muted-foreground px-4">
                We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              </p>
            </div>
            <GlassButton variant="outline" onClick={() => { setSignupSuccess(false); setMode("login"); }} className="w-full">
              Back to Login
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <GlassCard variant="glow" className="p-8 shadow-2xl space-y-6">
              <div className="space-y-4">
                <GlassInput
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
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

                <AnimatePresence>
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <GlassInput
                        label="Referral Code (optional)"
                        placeholder="REALLO-55"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                      />
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1 px-1">
                        <Gift className="w-3 h-3" /> Get 1,000 pts bonus
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <p className="text-xs text-destructive font-bold text-center bg-destructive/10 py-2 rounded-lg border border-destructive/20">
                  {error}
                </p>
              )}

              <GlassButton
                variant="primary"
                className="w-full text-base py-4 font-bold shadow-lg shadow-primary/20"
                onClick={handleSubmit}
                disabled={loading || !email || !password}
              >
                {loading ? "Authenticating..." : mode === "login" ? "Sign In" : "Get Started"}
              </GlassButton>
            </GlassCard>

            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-center py-2 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              {mode === "login" ? (
                <>Don't have an account? <span className="text-primary font-bold">Sign up</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-bold">Log in</span></>
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mx-auto transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Home
        </button>
      </motion.div>
    </div>
  );
};

export default Auth;
