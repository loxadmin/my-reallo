import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Shield, Sun, Moon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const DashboardHeader = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const firstName = profile?.email ? profile.email.split("@")[0] : "User";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 pt-6 pb-2 bg-gradient-to-b from-background to-transparent">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">Hi {displayName},</p>
          <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="p-2.5 rounded-2xl glass-button text-primary border-primary/20"
              title="Admin Panel"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative group">
                <Avatar className="w-11 h-11 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass rounded-2xl p-2 border-white/20">
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 rounded-xl focus:bg-primary/10 cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Toggle Theme
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-xl focus:bg-destructive/10 text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
