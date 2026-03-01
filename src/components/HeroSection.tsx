import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { Zap, TrendingUp, Users, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import GlassCard from "./GlassCard";

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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12 overflow-hidden">
      {/* Dynamic orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg mx-auto z-10 flex flex-col items-center"
      >
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-4 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-[10px] font-display text-primary font-bold tracking-[0.2em] uppercase">
            Live Queue • Reclaim Now
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl sm:text-6xl font-bold leading-[1] mb-6 tracking-tight"
        >
          <span className="text-foreground">Stop </span>
          <TypewriterText text="Losing" delay={800} speed={120} className="gradient-text" />
          <br />
          <span className="text-foreground italic">Your Hard-Earned Money</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed max-w-sm mx-auto font-medium"
        >
          Calculate your annual spend, join the waitlist, and reclaim it back toward your life goals.
        </motion.p>

        {/* Action button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="w-full max-w-xs space-y-4"
        >
          <button
            onClick={onGetStarted}
            className="clay-primary w-full py-5 rounded-2xl flex items-center justify-center gap-2 group text-base"
          >
            Start Reclaiming Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-primary" /> Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> Fast</span>
            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-primary" /> No Fees</span>
          </div>
        </motion.div>

        {/* Features row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="grid grid-cols-3 gap-3 mt-12 w-full"
        >
          <GlassCard className="p-3 text-center border-primary/20 bg-primary/5">
            <p className="font-display text-xl font-bold text-primary glow-text">
              <CountUpAnimation end={queueCount} duration={2} suffix="+" />
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">In Queue</p>
          </GlassCard>
          <GlassCard className="p-3 text-center border-primary/20 bg-primary/5">
            <p className="font-display text-xl font-bold text-primary glow-text">5x</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Referral Boost</p>
          </GlassCard>
          <GlassCard className="p-3 text-center border-primary/20 bg-primary/5">
            <p className="font-display text-xl font-bold text-primary glow-text">100%</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">Reclaimed</p>
          </GlassCard>
        </motion.div>

        {/* Visual cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-primary to-transparent" />
          <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest">Scroll to explore</p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
