import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";

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
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-20 pb-12 overflow-hidden">
      {/* Dynamic ambient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -40, 0],
          y: [0, 60, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[140px] pointer-events-none"
      />

      {/* Subtle glass mesh gradient overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none dark:opacity-[0.05]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg mx-auto z-10 flex flex-col items-center"
      >
        {/* Status pill with glass-pill utility */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-4 py-1.5 mb-8 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-[10px] font-display text-primary font-bold tracking-[0.2em] uppercase">
            Reclaim Your Spend
          </span>
        </motion.div>

        {/* Headline with typewriter */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] mb-4 tracking-tight"
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
          className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed max-w-md mx-auto px-4"
        >
          Calculate your annual utility spend and claim it back toward your life goals.
        </motion.p>

        {/* Wallet Animation Container with glass card feel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mb-8 w-full max-w-[200px] relative"
        >
          <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full dark:bg-primary/5" />
          <div className="relative z-10">
            <WalletAnimation />
          </div>
        </motion.div>

        {/* CTA Buttons - Using clay-primary and glass-outline utilities */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm px-4"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-base px-8 py-4 flex-1 clay-primary rounded-2xl shadow-xl">
            Calculate & Claim
          </GlassButton>
          <GlassButton variant="outline" className="text-base px-8 py-4 flex-1 rounded-2xl border-primary/20 hover:bg-primary/5">
            How It Works
          </GlassButton>
        </motion.div>

        {/* Stats grid using glass-stat utility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="grid grid-cols-3 gap-4 mt-12 w-full max-w-md px-4"
        >
          {[
            { label: "In Queue", val: <CountUpAnimation end={queueCount} duration={2} suffix="+" /> },
            { label: "To Join", val: "₦0" },
            { label: "Per Referral", val: "5x" }
          ].map((stat, i) => (
            <div key={i} className="glass-stat rounded-2xl px-4 py-3.5 text-center flex flex-col justify-center">
              <p className="font-display text-lg font-bold text-primary glow-text leading-none mb-1">
                {stat.val}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-80">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
