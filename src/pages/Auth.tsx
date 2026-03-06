import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, UserPlus, LogIn, Gift } from "lucide-react";
import Navbar from "@/components/Navbar";
import RealloLogo from "@/components/RealloLogo";
import WaterBackground from "@/components/WaterBackground";

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
      else navigate("/");
    } else {
      const { error } = await signUp(email, password, referralCode || undefined);
      if (error) setError(error.message);
      else setSignupSuccess(true);
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
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-xl font-display text-[13px] font-medium transition-all duration-300 ${
                  mode === "login" ? "clay-primary text-primary-foreground" : "glass-button text-muted-foreground"
                }`}
              >
                <LogIn className="inline w-4 h-4 mr-1.5" /> Login
              </button>
              <button
                onClick={() => setMode("signup")}
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
                <GlassInput label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <GlassInput label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

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
