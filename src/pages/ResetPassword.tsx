import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import KarbaliLogo from "@/components/KarbaliLogo";
import WaterBackground from "@/components/WaterBackground";
import { getPasswordStrength } from "@/lib/security";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash params for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Also check if there's already an active session (recovery token was already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // If we have a session and arrived at /reset-password, treat it as recovery
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2500);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-24">
        <WaterBackground />
        <Navbar />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10">
          <GlassCard variant="glow" className="text-center">
            <h2 className="font-display text-lg font-bold text-foreground mb-2">Invalid Reset Link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This link is invalid or has expired. Please request a new password reset.
            </p>
            <GlassButton variant="outline" onClick={() => navigate("/auth")}>
              Back to Login
            </GlassButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-24">
      <WaterBackground />
      <Navbar />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <KarbaliLogo size={28} />
            <h1 className="font-display text-xl font-bold gradient-text">Karbali</h1>
          </div>
          <p className="text-sm text-muted-foreground">Set your new password</p>
        </div>

        {success ? (
          <GlassCard variant="glow" className="text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-lg font-bold text-foreground mb-2">Password Updated!</h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to your dashboard…
            </p>
          </GlassCard>
        ) : (
          <GlassCard variant="glow">
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <GlassInput
                    label="New Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && passwordStrength && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors duration-300"
                          style={{
                            backgroundColor: i <= passwordStrength.score ? passwordStrength.color : "hsl(var(--muted))",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              <GlassInput
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              {error && <p className="text-sm text-destructive font-medium">{error}</p>}

              <GlassButton
                variant="primary"
                className="w-full mt-4 py-3.5"
                onClick={handleReset}
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? "Updating…" : "Set New Password"}
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
