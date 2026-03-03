import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/4 rounded-full blur-[220px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[180px]" />
      </div>
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <HeroSection onGetStarted={handleGetStarted} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
