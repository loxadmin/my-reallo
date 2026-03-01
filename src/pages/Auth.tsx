import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { LogIn, UserPlus, Mail, Lock } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) navigate("/dashboard");

    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setIsLogin(false);
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await signUp(email, password, referralCode);
        if (error) throw error;
        toast.success("Account created! Check your email.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-foreground mb-3">Reallo</h1>
          <p className="text-muted-foreground">Join the future of utility reclaims</p>
        </div>

        <GlassCard className="p-8">
          <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                isLogin ? "bg-white dark:bg-white/10 shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                !isLogin ? "bg-white dark:bg-white/10 shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <GlassInput
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <GlassInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <GlassInput
                    label="Referral Code (Optional)"
                    placeholder="ENTER CODE"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <GlassButton type="submit" loading={loading} className="w-full py-4 mt-4 shadow-xl">
              {isLogin ? "Sign In" : "Create Account"}
            </GlassButton>
          </form>
        </GlassCard>

        <p className="text-center mt-8 text-xs text-muted-foreground leading-relaxed px-4">
          By continuing, you agree to Reallo's <span className="text-primary cursor-pointer">Terms of Service</span> and <span className="text-primary cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
