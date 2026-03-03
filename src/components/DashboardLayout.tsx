import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Award, Target, ShieldCheck, History, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import WaterBackground from "./WaterBackground";
import RealloEyeLogo from "./RealloEyeLogo";
import ThemeToggle from "./ThemeToggle";
import type { DashView } from "./BottomNav";

interface SidebarProps {
  activeView: string;
  onViewChange?: (view: DashView) => void;
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const { profile, signOut } = useAuth();

  const navItems = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    { id: "goal", label: "Goal", icon: Target },
    { id: "verify", label: "Verify", icon: ShieldCheck },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface/50 backdrop-blur-xl border-r border-white/5 p-6 h-screen sticky top-0">
      <div className="flex items-center gap-3 mb-10">
        <RealloEyeLogo className="w-8 h-8 text-primary" />
        <h2 className="text-xl font-bold font-display tracking-tight text-foreground">
          Reallo
        </h2>
      </div>

      <nav className="space-y-2 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-4 ml-2">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange?.(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                activeView === item.id
                  ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(124,58,237,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", activeView === item.id ? "text-primary" : "group-hover:text-foreground")} />
              <span className="font-medium">{item.label}</span>
              {activeView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}

        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-8 mb-4 ml-2">Account</p>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300">
          <History className="w-5 h-5" />
          <span className="font-medium">History</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300">
          <User className="w-5 h-5" />
          <span className="font-medium">Profile</span>
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between px-2">
           <ThemeToggle />
           <button
             onClick={() => signOut()}
             className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
             title="Sign Out"
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="text-primary font-bold">{profile?.full_name?.charAt(0) || "U"}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate text-foreground">{profile?.full_name || "User"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: DashView;
  onViewChange: (view: DashView) => void;
}

const DashboardLayout = ({ children, activeView, onViewChange }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      <WaterBackground />

      <Sidebar activeView={activeView} onViewChange={onViewChange} />

      <main className="flex-1 relative z-10 w-full lg:max-w-7xl lg:mx-auto">
        <div className="p-4 md:p-10 pb-24 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
