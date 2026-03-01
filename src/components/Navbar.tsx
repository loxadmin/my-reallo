import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard, User } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none"
    >
      <div className="max-w-lg mx-auto glass rounded-2xl px-4 py-2 flex items-center justify-between pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/5 bg-background/20 backdrop-blur-xl">
        <button
          onClick={() => navigate("/")}
          className="font-display text-xl font-bold gradient-text tracking-tighter flex items-center gap-2 group transition-all"
        >
          <div className="p-1 rounded-lg group-hover:bg-primary/10 transition-colors">
            <RealloEyeLogo size={28} className="text-primary" />
          </div>
          <span className="group-hover:translate-x-0.5 transition-transform">Reallo</span>
        </button>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-1.5 ml-1 pl-1.5 border-l border-white/10">
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className={`p-2 rounded-xl transition-all duration-300 ${location.pathname === '/admin' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'glass-button text-primary hover:bg-primary/10'}`}
                  title="Admin"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                 <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={10} className="text-primary" />
                 </div>
                 <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-widest truncate max-w-[80px]">
                    {profile?.full_name?.split(' ')[0] || 'User'}
                 </span>
              </div>

              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="p-2 rounded-xl glass-button text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] text-primary font-bold uppercase tracking-[0.2em]">Live</span>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
