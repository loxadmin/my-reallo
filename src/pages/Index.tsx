import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GlassCard from "@/components/GlassCard";
import { ShieldCheck, Zap, TrendingUp, Award, Gift, Clock } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const steps = [
    {
      icon: TrendingUp,
      title: "Calculate Spend",
      desc: "Tell us how much you spend on data and electricity each month."
    },
    {
      icon: Clock,
      title: "Join the Queue",
      desc: "Wait for your turn or skip positions by referring your friends."
    },
    {
      icon: ShieldCheck,
      title: "Verify & Reclaim",
      desc: "Verify your expenses and reclaim your funds for your goals."
    }
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      <AnimatePresence mode="wait">
        <motion.div
          key="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <HeroSection onGetStarted={handleGetStarted} />

          {/* Value Prop Section */}
          <section className="px-6 py-24 max-w-lg mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">
                How It Works
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Reallo is the world's first platform designed to help you recover your unavoidable expenses.
              </p>
            </div>

            <div className="space-y-8">
              {steps.map((step, i) => (
                <GlassCard key={i} className="flex gap-6 items-start p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                    <step.icon size={80} />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-lg text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Bottom CTA */}
            <GlassCard variant="glow" className="text-center py-12 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold text-foreground tracking-tight">
                  Ready to start?
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Join thousands of users reclaiming their spend today.
                </p>
              </div>
              <button
                onClick={handleGetStarted}
                className="clay-primary w-full py-5 rounded-2xl font-display font-bold text-base"
              >
                Join the Queue Now
              </button>
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest opacity-60">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Fast</span>
              </div>
            </GlassCard>
          </section>

          {/* Footer */}
          <footer className="px-6 py-12 text-center border-t border-primary/10 bg-muted/20">
            <div className="max-w-lg mx-auto space-y-6">
              <div className="flex items-center justify-center gap-2 opacity-60">
                <div className="w-8 h-8 rounded-lg glass border-primary/20 flex items-center justify-center grayscale">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="font-display font-bold text-lg text-foreground tracking-tighter grayscale">
                  Reallo
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                © 2024 Reallo. All rights reserved. <br />
                Reclaim your utility spend, transform your life.
              </p>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
