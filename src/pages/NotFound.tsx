import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[200px]" />
      </div>
      <Navbar />
      <GlassCard variant="glow" className="text-center max-w-sm">
        <h1 className="font-display text-6xl font-bold gradient-text mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Oops! Page not found</p>
        <Link to="/">
          <GlassButton variant="primary">Return to Home</GlassButton>
        </Link>
      </GlassCard>
    </div>
  );
};

export default NotFound;
