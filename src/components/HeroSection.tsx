import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Users } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const [profilesRes, ghostsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      ]);
      setQueueCount((profilesRes.count || 0) + (ghostsRes.count || 0));
    };
    fetchCount();
  }, []);

  const handleCTA = () => {
    if (user) navigate("/dashboard");
    else navigate("/auth");
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
      <div className="z-10 w-full max-w-4xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

        {/* Left side: Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-8 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2.5 glass-pill rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">
              Financial Freedom Reclaimed
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight">
            Stop <span className="gradient-text">Losing</span><br />
            Your Money
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            Calculate your annual utility spend and claim it back toward your life goals with Reallo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <GlassButton
              variant="primary"
              onClick={handleCTA}
              className="text-base px-10 py-4 shadow-xl shadow-primary/20"
            >
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </GlassButton>
            <GlassButton
              variant="outline"
              className="text-base px-10 py-4"
            >
              Learn More
            </GlassButton>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold font-display"><CountUpAnimation end={queueCount} duration={2} suffix="+" /></p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">In Queue</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-display">₦0</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Fee</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-display">5x</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Skip</p>
            </div>
          </div>
        </motion.div>

        {/* Right side: Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          <div className="relative z-10 glass-card rounded-[3rem] p-12 aspect-square flex items-center justify-center shadow-2xl">
            <WalletAnimation />
          </div>

          {/* Decorative floating elements */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 glass-strong rounded-3xl p-6 shadow-xl z-20"
          >
            <Zap className="w-8 h-8 text-primary" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-10 -left-10 glass-strong rounded-3xl p-6 shadow-xl z-20"
          >
            <TrendingUp className="w-8 h-8 text-green-500" />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
