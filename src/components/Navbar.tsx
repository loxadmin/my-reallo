import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-lg mx-auto glass rounded-2xl px-5 py-3 flex items-center justify-between border-white/10">
        <button onClick={() => navigate("/")} className="font-display text-lg font-bold gradient-text tracking-tight flex items-center gap-2">
          <RealloEyeLogo size={28} />
          Reallo
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-xs font-display font-semibold text-foreground glass-button rounded-xl hidden sm:block"
              >
                Dashboard
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="p-2 rounded-xl glass-button group"
                  title="Admin"
                >
                  <Shield className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="p-2 rounded-xl glass-button group"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 glass-pill px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
