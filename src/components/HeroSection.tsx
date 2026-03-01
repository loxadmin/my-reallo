import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import GlassCard from "./GlassCard";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Zap, Globe } from "lucide-react";

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
      {/* Soft ambient orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-primary/6 blur-[140px] pointer-events-none" />

      <GlassCard
        variant="glow"
        className="max-w-md mx-auto z-10 flex flex-col items-center text-center p-8 sm:p-10 border-primary/10"
      >
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
          <span className="text-[10px] font-display font-bold text-primary tracking-[0.2em] uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        {/* Headline with typewriter */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] mb-4 tracking-tight"
        >
          <span className="text-foreground">Stop </span>
          <TypewriterText text="Losing" delay={800} speed={120} className="gradient-text" />
          <br />
          <span className="text-foreground">Your Money</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-sm sm:text-base mb-8 leading-relaxed max-w-xs mx-auto"
        >
          Calculate your annual utility spend and claim it back toward your life goals.
        </motion.p>

        {/* Features Row */}
        <div className="grid grid-cols-3 gap-4 mb-8 w-full">
           <div className="flex flex-col items-center gap-1">
             <div className="p-2 rounded-xl bg-primary/10">
               <ShieldCheck className="w-4 h-4 text-primary" />
             </div>
             <span className="text-[10px] text-muted-foreground font-medium">Secure</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="p-2 rounded-xl bg-primary/10">
               <Zap className="w-4 h-4 text-primary" />
             </div>
             <span className="text-[10px] text-muted-foreground font-medium">Instant</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <div className="p-2 rounded-xl bg-primary/10">
               <Globe className="w-4 h-4 text-primary" />
             </div>
             <span className="text-[10px] text-muted-foreground font-medium">Global</span>
           </div>
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col gap-3 justify-center w-full"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-base py-4 w-full">
            Calculate & Claim
          </GlassButton>
        </motion.div>

        {/* Stats row with live count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="flex justify-center gap-3 mt-10 w-full"
        >
          <div className="flex-1 glass-stat rounded-2xl py-3 text-center">
            <p className="font-display text-lg font-bold text-primary glow-text">
              <CountUpAnimation end={queueCount} duration={2} suffix="+" />
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide font-medium">In Queue</p>
          </div>
          <div className="flex-1 glass-stat rounded-2xl py-3 text-center">
            <p className="font-display text-lg font-bold text-primary glow-text">₦0</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide font-medium">To Join</p>
          </div>
          <div className="flex-1 glass-stat rounded-2xl py-3 text-center">
            <p className="font-display text-lg font-bold text-primary glow-text">5x</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide font-medium">Skip / Referral</p>
          </div>
        </motion.div>
      </GlassCard>
    </section>
  );
};

export default HeroSection;
