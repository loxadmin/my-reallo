import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import GlassButton from "@/components/GlassButton";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: Access denied for route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-background">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-destructive/5 rounded-full blur-[200px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 relative z-10"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative p-8 rounded-full border-2 border-dashed border-destructive/30 flex items-center justify-center">
            <ShieldAlert size={64} className="text-destructive" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-7xl font-black text-foreground tracking-tighter uppercase">404<span className="text-destructive">.</span></h1>
          <div className="space-y-1">
             <h2 className="text-xl font-bold text-foreground uppercase tracking-widest">Protocol Deviation Detected</h2>
             <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
               Your terminal attempted to access an unmapped sector of the Reallo grid: <code className="text-destructive font-bold">{location.pathname}</code>
             </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4">
           <GlassButton variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto px-8 border-white/10 text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> Revert Path
           </GlassButton>
           <GlassButton variant="primary" onClick={() => navigate("/")} className="w-full sm:w-auto px-8 clay-primary">
              <Home size={16} /> Return to Hub
           </GlassButton>
        </div>

        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] pt-8 opacity-40">
           System Integrity: Compromised (Isolated)
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
