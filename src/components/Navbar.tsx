import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard, Menu, X } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
import ThemeToggle from "./ThemeToggle";
import { useState } from "react";
import GlassButton from "./GlassButton";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isHome = location.pathname === "/";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 pt-10"
    >
      <div className="max-w-7xl mx-auto glass-strong rounded-[40px] px-8 py-6 flex items-center justify-between shadow-2xl shadow-black/10 border-white/10 dark:border-white/5 backdrop-blur-3xl">
        <button
          onClick={() => navigate("/")}
          className="font-black text-2xl tracking-tighter flex items-center gap-3 group"
        >
          <div className="bg-primary p-2 rounded-2xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-xl shadow-primary/20">
            <RealloEyeLogo size={32} color="white" />
          </div>
          <span className="text-foreground uppercase tracking-[0.2em] text-[16px]">Reallo</span>
        </button>

        {/* Desktop Links - Minimalist font rules */}
        <div className="hidden md:flex items-center gap-12 font-black uppercase tracking-[0.4em] text-[10px]">
          <button className="text-muted-foreground hover:text-primary transition-colors">Features</button>
          <button className="text-muted-foreground hover:text-primary transition-colors">Company</button>
          <button className="text-muted-foreground hover:text-primary transition-colors">Docs</button>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-1.5 flex items-center gap-2 border border-black/5 dark:border-white/5">
            <ThemeToggle />
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button onClick={() => navigate("/admin")} className="hidden sm:flex p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all shadow-xl shadow-primary/5" title="Admin">
                  <Shield className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => navigate("/dashboard")} className="hidden sm:flex p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all shadow-xl shadow-primary/5" title="Dashboard">
                <LayoutDashboard className="w-5 h-5" />
              </button>
              <GlassButton variant="primary" onClick={async () => { await signOut(); navigate("/"); }} className="px-8 py-4 h-auto rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] shadow-xl shadow-primary/20">
                Log Out
              </GlassButton>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-6">
              <button onClick={() => navigate("/auth")} className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground hover:text-primary transition-colors">Sign In</button>
              <GlassButton variant="primary" onClick={() => navigate("/auth")} className="px-10 py-4 h-auto rounded-2xl text-[9px] font-black uppercase tracking-[0.5em] shadow-2xl shadow-primary/30">
                Access Hub
              </GlassButton>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-foreground border border-black/5 dark:border-white/5">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Minimalist font rules */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-32 left-6 right-6 glass-strong rounded-[48px] p-12 md:hidden shadow-2xl z-50 border-white/20"
          >
            <div className="flex flex-col gap-10 text-center font-black uppercase tracking-[0.4em] text-[12px]">
              <button className="text-foreground hover:text-primary transition-colors">Features</button>
              <button className="text-foreground hover:text-primary transition-colors">Company</button>
              <button className="text-foreground hover:text-primary transition-colors">Documentation</button>
              <hr className="border-black/5 dark:border-white/10 opacity-50" />
              {!user ? (
                <div className="flex flex-col gap-6">
                  <button onClick={() => navigate("/auth")} className="text-foreground hover:text-primary transition-colors">Sign In</button>
                  <GlassButton variant="primary" onClick={() => navigate("/auth")} className="h-20 text-[11px] rounded-[32px] font-black tracking-[0.4em]">
                    Start Now
                  </GlassButton>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                   <GlassButton variant="primary" onClick={() => navigate("/dashboard")} className="h-20 text-[11px] rounded-[32px] font-black tracking-[0.4em]">
                    Dashboard Hub
                  </GlassButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
