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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12 overflow-hidden">
      {/* Dynamic ambient orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-accent/8 blur-[100px] pointer-events-none" />

      {/* Subtle overlay grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(hsla(var(--primary), 0.4) 1.5px, transparent 1.5px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg mx-auto z-10 flex flex-col items-center"
      >
        {/* Modern status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2.5 glass-pill rounded-full px-5 py-2 mb-8 shadow-xl border-white/5"
        >
          <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <span className="text-[12px] font-display text-primary font-bold tracking-[0.2em] uppercase">
            Reclaim Your Spending
          </span>
        </motion.div>

        {/* Overhauled Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] mb-4 tracking-tighter"
        >
          <span className="text-foreground">Stop </span>
          <TypewriterText text="Losing" delay={800} speed={120} className="gradient-text glow-text" />
          <br />
          <span className="text-foreground">Your Future</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-muted-foreground text-sm sm:text-lg mb-10 leading-relaxed max-w-sm mx-auto font-medium"
        >
          Your utility bills could be funding your life goals. Calculate your reclaim amount today.
        </motion.p>

        {/* Wallet Animation with float */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mb-10 w-full max-w-[220px] float-animation"
        >
          <WalletAnimation />
        </motion.div>

        {/* High-impact CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="text-base px-8 py-4 flex-1 shadow-2xl">
            Get Started
          </GlassButton>
          <GlassButton variant="outline" className="text-base px-8 py-4 flex-1 backdrop-blur-xl">
            How It Works
          </GlassButton>
        </motion.div>

        {/* Modernized Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="flex justify-center gap-4 mt-12 w-full"
        >
          {[
            { value: <CountUpAnimation end={queueCount} duration={2} suffix="+" />, label: "In Queue" },
            { value: "₦0", label: "Fee" },
            { value: "5x", label: "Boost" },
          ].map((stat, i) => (
            <div key={i} className="glass-stat rounded-3xl px-6 py-4 text-center flex-1 max-w-[110px] border-white/5 shadow-2xl transition-transform hover:scale-110">
              <p className="font-display text-xl font-bold text-primary glow-text">
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-bold">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
