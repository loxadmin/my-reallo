import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WaterBackground from "@/components/WaterBackground";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden transition-colors duration-300">
      <WaterBackground />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <HeroSection onGetStarted={handleGetStarted} />
          <FeaturesSection />

          <section className="py-24 px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto glass-card py-16 px-8 border-primary/20 bg-primary/5">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to reclaim your spend?</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                Join thousands of users who are turning their data and electricity bills into future investments.
              </p>
              <button
                onClick={handleGetStarted}
                className="gradient-button px-12 py-4 text-lg group"
              >
                Join the Waitlist
                <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          <footer className="py-12 px-4 border-t border-white/5 relative z-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-primary" />
                </div>
                <span className="font-display font-bold text-xl">Reallo</span>
              </div>
              <div className="flex gap-8 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                <a href="#" className="hover:text-primary transition-colors">Terms</a>
                <a href="#" className="hover:text-primary transition-colors">Contact</a>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Reallo. All rights reserved.
              </p>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
