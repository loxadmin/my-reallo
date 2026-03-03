import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AnimatedWaterLayer from "@/components/AnimatedWaterLayer";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden text-foreground selection:bg-primary/20">
      {/* SaaS Background Layout - Realistic Water Trapped */}
      <div className="fixed inset-0 z-0 bg-background overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
           <AnimatedWaterLayer />
           <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-[20px]" />
        </div>
        {/* Subtle Ambient Glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-primary/10 blur-[200px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <Navbar />
        <main className="w-full flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full"
            >
              <HeroSection onGetStarted={handleGetStarted} />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="w-full max-w-7xl py-24 px-6 mt-32 border-t border-black/5 dark:border-white/5 text-center flex flex-col items-center gap-6">
          <div className="flex items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Stripe Protocol</span>
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Secure Ledger</span>
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Hub</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.5em] mt-6">Reallo Reclaim Infrastructure © 2024</p>
          <p className="text-[10px] text-muted-foreground/40 max-w-md leading-relaxed uppercase tracking-widest font-black">
             All rights reserved. Bank-grade encryption and secure managed liquidity sectors.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
