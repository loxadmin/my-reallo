import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./GlassButton";
import CountUpAnimation from "./CountUpAnimation";
import { supabase } from "@/integrations/supabase/client";
import { MoveRight, TrendingUp, Users, Shield, Zap, Globe, Lock } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
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

  const features = [
    { icon: <Zap className="w-8 h-8" />, title: "Instant Reclaim", desc: "Real-time calculation and validation of your utility spend index." },
    { icon: <Lock className="w-8 h-8" />, title: "Bank-Grade Security", desc: "Your data is encrypted and managed with enterprise protocols." },
    { icon: <Globe className="w-8 h-8" />, title: "Universal Access", desc: "Support for major electricity and data providers nationwide." },
  ];

  const metrics = [
    { icon: <Users className="w-8 h-8 text-primary" />, label: "In Queue", value: <CountUpAnimation end={queueCount} duration={2} suffix="+" /> },
    { icon: <TrendingUp className="w-8 h-8 text-primary" />, label: "To Join", value: "₦0" },
    { icon: <Shield className="w-8 h-8 text-primary" />, label: "Skip / Referral", value: "5x" },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      {/* SaaS Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-32 pb-24 w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "circOut" }}
          className="w-full text-center z-10"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full px-6 py-2.5 mb-16">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-primary">Reclaim What's Yours</span>
          </div>

          <h1 className="text-6xl md:text-[100px] font-black leading-[1.0] mb-12 tracking-tighter text-foreground">
            Stop <br className="md:hidden" />
            <span className="relative inline-flex flex-col h-[1.1em] overflow-hidden align-bottom">
              <AnimatePresence mode="wait">
                <motion.span
                  key={titles[titleNumber]}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  className="absolute left-0 right-0 text-primary"
                  transition={{ duration: 0.6, ease: "circOut" }}
                >
                  {titles[titleNumber]}
                </motion.span>
              </AnimatePresence>
            </span> <br />
            Your Money.
          </h1>

          <p className="text-[13px] md:text-[16px] text-muted-foreground mb-20 max-w-2xl mx-auto leading-relaxed uppercase tracking-[0.4em] font-black opacity-80">
            Calculate your annual utility spend and reclaim it back toward your life goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-40 max-w-2xl mx-auto w-full">
            <GlassButton variant="primary" onClick={onGetStarted} className="w-full h-24 text-[13px] font-black uppercase tracking-[0.4em] rounded-[40px] shadow-2xl shadow-primary/30 group">
              Calculate & Claim <MoveRight className="ml-4 w-6 h-6 group-hover:translate-x-3 transition-transform" />
            </GlassButton>
            <GlassButton variant="outline" className="w-full h-24 text-[13px] font-black uppercase tracking-[0.4em] rounded-[40px] border-black/10 dark:border-white/10 group">
              How It Works
            </GlassButton>
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
            {metrics.map((m, i) => (
              <GlassCard key={i} className="flex flex-col items-center py-20 bg-white/5 dark:bg-black/20 rounded-[64px] border-black/5 dark:border-white/10 shadow-2xl shadow-black/5">
                <div className="bg-primary/10 p-6 rounded-3xl mb-10 border border-primary/20">
                  {m.icon}
                </div>
                <div className="text-6xl font-black mb-4 tracking-tighter text-foreground leading-none">{m.value}</div>
                <div className="text-[10px] uppercase tracking-[0.5em] font-black text-muted-foreground">{m.label}</div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Feature Explainer */}
      <section className="py-56 px-6 w-full max-w-7xl">
        <div className="text-center mb-40">
           <div className="inline-flex items-center gap-5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-8 py-3 mb-12">
            <span className="text-[10px] uppercase tracking-[0.6em] font-black text-muted-foreground">System Architecture</span>
          </div>
          <h2 className="text-5xl md:text-8xl font-black mb-10 tracking-tighter text-foreground leading-none">Built for Financial Control</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-[13px] md:text-[16px] leading-relaxed uppercase tracking-[0.5em] font-black opacity-60">
            Experience a streamlined workflow designed for maximum efficiency and enterprise-grade security protocol integration.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
          {features.map((f, i) => (
            <GlassCard key={i} className="p-16 flex flex-col items-center text-center group rounded-[64px] border-black/5 dark:border-white/10 bg-white/5 dark:bg-black/20 shadow-2xl shadow-black/5">
              <div className="bg-primary p-8 rounded-3xl text-white mb-16 shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                {f.icon}
              </div>
              <h3 className="text-[14px] font-black mb-10 text-foreground tracking-[0.6em] uppercase leading-none">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-[12px] font-black uppercase tracking-[0.5em] opacity-60">
                {f.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Trust & Workflow Section */}
      <section className="py-56 px-6 w-full bg-black/[0.02] dark:bg-white/[0.02] border-y border-black/5 dark:border-white/10 flex flex-col items-center overflow-hidden">
         <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <div className="text-left">
               <span className="text-[10px] uppercase tracking-[0.8em] font-black text-primary mb-12 block">Workflow Sector Validation</span>
               <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter text-foreground leading-[1.0]">Enterprise Utility Reclaim Infrastructure.</h2>
               <p className="text-muted-foreground text-[13px] md:text-[16px] leading-relaxed uppercase tracking-[0.5em] font-black mb-20 opacity-60">
                  Integrate your monthly spend index with our secure validation engine to unlock life-changing financial targets across all enterprise sectors.
               </p>
               <GlassButton variant="outline" className="h-24 px-16 text-[12px] font-black uppercase tracking-[0.5em] rounded-[40px] border-black/10 dark:border-white/10 hover:bg-primary/10 transition-all">
                  Documentation <MoveRight className="ml-6 w-6 h-6" />
               </GlassButton>
            </div>
            <div className="relative group">
               <div className="absolute inset-0 bg-primary/15 blur-[200px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
               <GlassCard className="p-6 relative border-black/5 dark:border-white/10 overflow-hidden rounded-[80px] bg-white/5 dark:bg-black/40 shadow-2xl shadow-black/20">
                  <div className="aspect-video bg-black/[0.04] dark:bg-white/[0.04] rounded-[64px] flex items-center justify-center border border-black/5 dark:border-white/10 group-hover:scale-[1.05] transition-transform duration-700">
                      <RealloEyeLogo size={240} color="#0F3D2E" />
                  </div>
               </GlassCard>
            </div>
         </div>
      </section>

      {/* Final Enterprise CTA */}
      <section className="py-64 px-6 w-full max-w-7xl text-center">
        <GlassCard className="py-40 px-12 md:px-32 border-primary/30 relative overflow-hidden bg-white/5 dark:bg-black/50 rounded-[80px] shadow-2xl shadow-primary/20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[4px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-100 blur-[2px]" />
          <h2 className="text-6xl md:text-[100px] font-black mb-16 tracking-tighter text-foreground leading-none">Execute Your <br className="md:hidden" /> Reclaim Index.</h2>
          <p className="text-[13px] md:text-[16px] text-muted-foreground mb-24 max-w-3xl mx-auto uppercase tracking-[0.6em] font-black leading-relaxed opacity-60">
            Join the enterprise waitlist and start reclaiming your utility spend toward your life goals immediately.
          </p>
          <GlassButton variant="primary" onClick={onGetStarted} className="mx-auto h-28 px-24 text-[14px] font-black uppercase tracking-[0.6em] rounded-[56px] shadow-[0_0_50px_rgba(15,61,46,0.4)] hover:scale-[1.08] active:scale-95 transition-all">
            Access Free Account
          </GlassButton>
        </GlassCard>
      </section>
    </div>
  );
};

export default HeroSection;
