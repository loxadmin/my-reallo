import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import GlassCard from "./GlassCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Play, Zap, Users, Gift } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
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

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg mx-auto z-10 flex flex-col"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 self-center bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
          <span className="text-[11px] font-display text-primary/70 tracking-[0.2em] uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        {/* Hero Title */}
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-display text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
          >
            <span className="text-foreground">Stop </span>
            <TypewriterText text="Losing" delay={800} speed={120} className="gradient-text" />
            <br />
            <span className="text-foreground">Your Money</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="text-muted-foreground text-base sm:text-lg max-w-sm mx-auto leading-relaxed"
          >
            Calculate your annual utility spend and claim it back toward your life goals.
          </motion.p>
        </div>

        {/* Visual Element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="relative mb-12 flex justify-center"
        >
          <div className="absolute inset-0 bg-primary/5 blur-[60px] rounded-full scale-110" />
          <div className="relative w-full max-w-[240px]">
            <WalletAnimation />
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs mx-auto mb-12"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-sm px-6 py-3 flex-1">
            Calculate & Claim
          </GlassButton>
          <GlassButton variant="outline" className="text-sm px-6 py-3 flex-1">
            How It Works
          </GlassButton>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="grid grid-cols-3 gap-3"
        >
          <GlassCard className="px-2 py-4 text-center space-y-1" animate={false}>
            <p className="font-display text-lg font-bold text-primary glow-text">
              <CountUpAnimation end={queueCount} duration={2} suffix="+" />
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">In Queue</p>
          </GlassCard>
          <GlassCard className="px-2 py-4 text-center space-y-1" animate={false}>
            <p className="font-display text-lg font-bold text-primary glow-text">₦0</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">To Join</p>
          </GlassCard>
          <GlassCard className="px-2 py-4 text-center space-y-1" animate={false}>
            <p className="font-display text-lg font-bold text-primary glow-text">5x</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Skip / Referral</p>
          </GlassCard>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
