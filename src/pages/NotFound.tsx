import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import Navbar from "@/components/Navbar";
import WaterBackground from "@/components/WaterBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <WaterBackground />
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard variant="glow" className="text-center max-w-sm">
          <h1 className="font-display text-5xl font-bold gradient-text mb-4">404</h1>
          <p className="text-muted-foreground text-sm mb-6">Oops! Page not found</p>
          <Link to="/">
            <GlassButton variant="primary" className="text-sm">Return to Home</GlassButton>
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default NotFound;
