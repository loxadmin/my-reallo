import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="font-display text-[13px] font-bold text-foreground tracking-tight"
        >
          <span className="gradient-text">Reallo</span>
        </button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <button onClick={() => navigate("/admin")} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Admin">
                  <Shield className="w-4 h-4 text-primary" />
                </button>
              )}
              <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Dashboard">
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={async () => { await signOut(); navigate("/"); }} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Sign Out">
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
    </nav>
  );
};

export default Navbar;
