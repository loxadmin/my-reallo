import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackDownload } from "@/lib/tracker";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import WaterBackground from "@/components/WaterBackground";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGetStarted = () => {
    trackDownload();
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <HeroSection onGetStarted={handleGetStarted} />
          <HowItWorks />
          <Footer />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
