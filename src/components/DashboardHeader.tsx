import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const DashboardHeader = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const name = profile?.email ? profile.email.split("@")[0] : "User";
  const firstName = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/40 backdrop-blur-lg border-b border-border/10 px-6 py-5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground font-medium">Welcome back,</p>
          <h2 className="text-xl font-bold font-display tracking-tight">Hi {firstName},</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 rounded-full glass-button flex items-center justify-center"
              title="Admin Panel"
            >
              <Shield className="w-5 h-5 text-primary" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full glass-button flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
