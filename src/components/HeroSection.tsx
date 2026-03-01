import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import WalletAnimation from "./WalletAnimation";
import CountUpAnimation from "./CountUpAnimation";
import TypewriterText from "./TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from "lucide-react";

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
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 pt-28 pb-20">
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Modern status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2.5 px-5 py-2 glass-pill rounded-full mb-10 border border-primary/20 shadow-sm"
        >
          <div className="flex -space-x-1.5">
             {[1,2,3].map(i => (
               <div key={i} className="w-5 h-5 rounded-full border-2 border-background bg-muted-foreground/20 overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="user" />
               </div>
             ))}
          </div>
          <span className="text-[11px] font-bold font-display text-primary tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
            {queueCount.toLocaleString()}+ Users Already Reclaiming
          </span>
        </motion.div>

        {/* Original Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-7xl font-bold font-display leading-[1] mb-6 tracking-tight"
        >
          <span className="text-foreground">Stop Losing </span>
          <br className="hidden sm:block" />
          <TypewriterText text="Your Money" delay={800} speed={120} className="gradient-text" />
          <span className="text-foreground italic font-light ml-1">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-muted-foreground text-base sm:text-xl mb-12 leading-relaxed max-w-lg mx-auto font-medium"
        >
          Calculate your annual data & electricity spend and claim it back as business funding, vacation, or education.
        </motion.p>

        {/* Enhanced Visual Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1, type: "spring" }}
          className="mb-14 relative group"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-75 group-hover:scale-100 transition-transform duration-700" />
          <div className="w-48 sm:w-64 aspect-square relative z-10">
            <WalletAnimation />
          </div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-4 -right-4 p-4 glass-card rounded-2xl border-primary/20"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
        </motion.div>

        {/* Direct Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm mb-16"
        >
          <GlassButton variant="primary" onClick={onGetStarted} className="px-8 py-5 rounded-2xl flex-1 text-lg group">
            Calculate & Claim
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </GlassButton>
          <GlassButton variant="outline" className="px-8 py-5 rounded-2xl flex-1 text-lg">
            Learn More
          </GlassButton>
        </motion.div>

        {/* Modern Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-lg"
        >
          {[
            { icon: Users, val: queueCount, suffix: "+", label: "Waitlist" },
            { icon: TrendingUp, val: 5, suffix: "x", label: "Faster" },
            { icon: Zap, val: 0, suffix: " Cost", label: "To Join" }
          ].map((stat, idx) => (
            <div key={idx} className="glass-stat rounded-3xl px-4 py-5 flex flex-col items-center gap-1.5 border-primary/10 hover:border-primary/30 transition-colors">
              <stat.icon className="w-5 h-5 text-primary/60" />
              <p className="font-display text-xl font-bold text-foreground">
                {typeof stat.val === 'number' ? <CountUpAnimation end={stat.val} duration={2} suffix={stat.suffix} /> : stat.val}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
