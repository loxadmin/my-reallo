import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

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
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md mx-auto z-10 flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 mb-8 border border-primary/20"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase">
            Start Your Journey
          </span>
        </motion.div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight mb-6">
          <span className="text-foreground">Stop </span>
          <TypewriterText text="Losing" delay={800} speed={120} className="text-primary" />
          <br />
          <span className="text-foreground">Your Money</span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed max-w-sm mx-auto">
          Calculate your annual utility spend and claim it back toward your life goals with Reallo.
        </p>

        <div className="mb-10 w-48 h-48 flex items-center justify-center">
          <WalletAnimation />
        </div>

        <div className="flex flex-col gap-4 w-full px-4">
          <GlassButton variant="primary" onClick={onGetStarted} className="text-base py-4 w-full shadow-2xl">
            Get Started
          </GlassButton>
          <GlassButton variant="outline" className="text-base py-4 w-full">
            Learn More
          </GlassButton>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-12 w-full">
          <div className="glass-card rounded-[1.5rem] p-4 text-center">
            <p className="text-lg font-bold text-primary">
              <CountUpAnimation end={queueCount} duration={2} suffix="+" />
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Waitlist</p>
          </div>
          <div className="glass-card rounded-[1.5rem] p-4 text-center">
            <p className="text-lg font-bold text-primary">₦0</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Entry Fee</p>
          </div>
          <div className="glass-card rounded-[1.5rem] p-4 text-center">
            <p className="text-lg font-bold text-primary">5x</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Boost</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
