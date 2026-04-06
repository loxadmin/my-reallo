import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, LayoutDashboard, Menu, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import KarbaliLogo from "./KarbaliLogo";
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

  const isDashboard = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");
  const isAuthPage = location.pathname === "/auth" || location.pathname === "/reset-password";
  const isLanding = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center">
          {!isAuthPage && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 group"
            >
              <KarbaliLogo size={24} className="group-hover:scale-110 transition-transform duration-300" />
              <span className="font-display text-[15px] font-bold text-foreground tracking-tight gradient-text">Karbali</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Landing page nav links */}
          {isLanding && !user && (
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-lg"
              >
                How It Works
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 text-[13px] bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}

          <ThemeToggle />
          {user ? (
            <>
              {/* Trap link for bots/hackers */}
              <a
                href="/admin-console-v2"
                style={{ opacity: 0.01, position: "absolute", zIndex: -1, pointerEvents: "none" }}
                tabIndex={-1}
              >
                Admin Panel
              </a>

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
                  onClick={() => navigate("/dashboard/profile")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Profile"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                </button>
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
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] text-primary"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}

                    {!isDashboard && (
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] text-muted-foreground"
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] text-muted-foreground"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : !isLanding ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
              <span className="text-[12px] text-muted-foreground font-medium">Live</span>
            </div>
          ) : (
            /* Mobile menu for landing page */
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <Menu className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-strong min-w-[160px] rounded-2xl p-2 mt-2">
                  <DropdownMenuItem
                    onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                    className="px-3 py-2.5 rounded-xl text-[14px] text-muted-foreground"
                  >
                    How It Works
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/auth")}
                    className="px-3 py-2.5 rounded-xl text-[14px] text-muted-foreground"
                  >
                    Login
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/auth")}
                    className="px-3 py-2.5 rounded-xl text-[14px] text-primary font-medium"
                  >
                    Sign Up
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
