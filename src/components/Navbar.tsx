import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-3"
    >
      <div className="max-w-5xl mx-auto glass-strong rounded-2xl px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="font-display text-base font-bold text-foreground tracking-tight flex items-center gap-1"
        >
          <span className="gradient-text">Reallo</span>
        </button>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <button onClick={() => navigate("/admin")} className="p-2 rounded-xl glass-button" title="Admin">
                  <Shield className="w-4 h-4 text-primary" />
                </button>
              )}
              <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl glass-button" title="Dashboard">
                <LayoutDashboard className="w-4 h-4 text-primary" />
              </button>
              <button onClick={async () => { await signOut(); navigate("/"); }} className="p-2 rounded-xl glass-button" title="Sign Out">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
              <span className="text-[11px] text-muted-foreground font-medium">Live</span>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
