import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./GlassButton";
import CountUpAnimation from "./CountUpAnimation";
import { supabase } from "@/integrations/supabase/client";
import { MoveRight, TrendingUp, Users, Shield } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  const [queueCount, setQueueCount] = useState(0);
  const [titleNumber, setTitleNumber] = useState(0);

  const titles = useMemo(() => ["Losing", "Wasting", "Burning", "Draining"], []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber(titleNumber === titles.length - 1 ? 0 : titleNumber + 1);
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-32 pb-16 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 w-full max-w-lg mx-auto text-center"
      >
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-5 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
          <span className="text-xs font-display text-accent/80 tracking-[0.15em] uppercase">
            Reclaim What's Yours
          </span>
        </motion.div>

        {/* Headline with animated word */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6 tracking-tight"
        >
          <span className="text-foreground">The Future of </span>
          <br />
          <span className="gradient-text">Smart Commerce</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-base sm:text-lg lg:text-xl mb-10 leading-relaxed max-w-xl mx-auto"
        >
          Unlock powerful experiences with gamified shopping. Calculate your annual utility spend and reclaim it toward your life goals.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
        >
          <button
            onClick={onGetStarted}
            className="gradient-button text-base px-10 py-4 flex-1 flex items-center justify-center"
          >
            Get Started <MoveRight className="w-5 h-5 ml-2" />
          </button>
          <button className="glass-button text-base px-10 py-4 flex-1 font-semibold text-foreground">
            How It Works
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="grid grid-cols-3 gap-3 sm:gap-4 mt-10 max-w-md mx-auto"
        >
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-primary glow-text">
              <CountUpAnimation end={queueCount} duration={2} suffix="+" />
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">In Queue</p>
          </div>
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <TrendingUp className="w-4 h-4 text-accent mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-accent">₦0</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">To Join</p>
          </div>
          <div className="glass-stat rounded-2xl px-3 py-4 text-center">
            <Shield className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <p className="font-display text-lg sm:text-xl font-bold text-primary glow-text">5x</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">Skip / Referral</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
