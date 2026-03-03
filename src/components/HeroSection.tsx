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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/8 blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/6 blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] left-[-8%] w-[300px] h-[300px] rounded-full bg-primary/4 blur-[120px] pointer-events-none" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(hsl(217 91% 60% / 0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

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
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4"
        >
          <span className="text-foreground">Stop </span>
          <span className="relative inline-flex flex-col h-[1.15em] overflow-hidden">
            <AnimatePresence mode="wait">
              {titles.map(
                (title, index) =>
                  index === titleNumber && (
                    <motion.span
                      key={title}
                      className="gradient-text absolute"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      {title}
                    </motion.span>
                  )
              )}
            </AnimatePresence>
          </span>
          <br />
          <span className="text-foreground">Your Money</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-8 leading-relaxed max-w-md mx-auto"
        >
          Calculate your annual utility spend and claim it back toward your life goals.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-sm px-8 py-4 flex-1">
            Calculate & Claim <MoveRight className="inline w-4 h-4 ml-2" />
          </GlassButton>
          <GlassButton variant="outline" className="text-sm px-8 py-4 flex-1">
            How It Works
          </GlassButton>
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
