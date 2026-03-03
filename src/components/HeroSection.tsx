import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./GlassButton";
import CountUpAnimation from "./CountUpAnimation";
import { supabase } from "@/integrations/supabase/client";
import { MoveRight, TrendingUp, Users, Shield, Zap, Lock, Globe } from "lucide-react";
import GlassCard from "./GlassCard";

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
    <div className="w-full flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="z-10 w-full max-w-4xl mx-auto text-center"
        >
          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 glass-pill rounded-full px-5 py-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold text-primary tracking-widest uppercase">
              Reclaim What's Yours
            </span>
          </motion.div>

          <h1 className="font-bold leading-[1.1] mb-6 tracking-tight">
            <span className="text-foreground">Stop </span>
            <span className="relative inline-flex flex-col h-[1.15em] overflow-hidden min-w-[120px] sm:min-w-[180px]">
              <AnimatePresence mode="wait">
                {titles.map(
                  (title, index) =>
                    index === titleNumber && (
                      <motion.span
                        key={title}
                        className="text-primary absolute left-0 right-0"
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
          </h1>

          <p className="text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Calculate your annual utility spend and claim it back toward your life goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-16">
            <GlassButton variant="primary" onClick={onGetStarted} className="px-10 py-4 flex-1">
              Calculate & Claim <MoveRight className="inline w-4 h-4 ml-2" />
            </GlassButton>
            <GlassButton variant="default" className="px-10 py-4 flex-1">
              How It Works
            </GlassButton>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="glass-card rounded-[20px] p-4 text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-foreground">
                <CountUpAnimation end={queueCount} duration={2} suffix="+" />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In Queue</p>
            </div>
            <div className="glass-card rounded-[20px] p-4 text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-foreground">₦0</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">To Join</p>
            </div>
            <div className="glass-card rounded-[20px] p-4 text-center">
              <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-foreground">5x</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Skip / Referral</p>
            </div>
            <div className="glass-card rounded-[20px] p-4 text-center">
              <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="font-bold text-xl text-foreground">Secure</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Encryption</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Highlights */}
      <section className="py-24 px-4 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="mb-4">Feature Highlights</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Calculate your annual utility spend and claim it back toward your life goals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Metrics Section</h3>
            <p className="text-muted-foreground leading-relaxed">Calculate your annual utility spend and claim it back toward your life goals.</p>
          </GlassCard>
          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Workflow Explanation</h3>
            <p className="text-muted-foreground leading-relaxed">Calculate your annual utility spend and claim it back toward your life goals.</p>
          </GlassCard>
          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Trust Indicators</h3>
            <p className="text-muted-foreground leading-relaxed">Calculate your annual utility spend and claim it back toward your life goals.</p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
