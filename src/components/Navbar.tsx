import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard, Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import RealloLogo from "./RealloLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";

interface NavbarProps {
  children?: ReactNode;
}

const Navbar = ({ children }: NavbarProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <RealloLogo size={26} className="group-hover:scale-110 transition-transform duration-300" />
          <span className="font-display text-base font-bold text-foreground tracking-tightest gradient-text">Reallo</span>
        </button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Admin"
                  >
                    <Shield className="w-4 h-4 text-primary" />
                  </button>
                )}
                {!isDashboard && (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Mobile Nav */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Menu className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong min-w-[180px] rounded-2xl p-2 mt-2">
                    {children}
                    {children && <DropdownMenuSeparator className="my-2" />}

                    {isAdmin && (
                      <DropdownMenuItem
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-primary"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}

                    {!isDashboard && (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-muted-foreground"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={async () => {
                        await signOut();
                        navigate("/");
                      }}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-muted-foreground"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
              <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
              <span className="text-xs text-primary font-bold uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
