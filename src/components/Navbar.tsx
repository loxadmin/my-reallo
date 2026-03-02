import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard, User } from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = location.pathname === "/auth";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 pt-6"
    >
      <div className="max-w-lg mx-auto glass-strong rounded-[1.5rem] px-5 py-3 flex items-center justify-between shadow-xl border-white/10">
        <button
          onClick={() => navigate("/")}
          className="font-display text-xl font-bold tracking-tight flex items-center gap-2 group"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
            <RealloEyeLogo size={20} />
          </div>
          <span className="gradient-text">Reallo</span>
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="p-2.5 rounded-xl glass-button text-primary hover:bg-primary/10"
                  title="Admin"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2.5 rounded-xl glass-button text-foreground hover:bg-white/5"
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="p-2.5 rounded-xl glass-button text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            !isAuthPage && (
              <GlassButton
                variant="primary"
                onClick={() => navigate("/auth")}
                className="px-4 py-2 text-xs font-bold rounded-xl"
              >
                Sign In
              </GlassButton>
            )
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
