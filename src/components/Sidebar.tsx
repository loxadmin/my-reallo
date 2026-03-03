import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  Shield,
  LayoutDashboard,
  Award,
  Target,
  ShieldCheck,
  PieChart,
  Activity,
  User,
  Settings,
  CreditCard
} from "lucide-react";
import RealloEyeLogo from "./RealloEyeLogo";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import GlassButton from "./GlassButton";

interface SidebarProps {
  active: string;
  onChange: (view: any) => void;
}

const Sidebar = ({ active, onChange }: SidebarProps) => {
  const navigate = useNavigate();
  const { signOut, isAdmin, profile } = useAuth();
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  const mainLinks = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    { id: "earn", label: "Earnings Hub", icon: Award },
    { id: "goal", label: "Targets Index", icon: Target },
    ...(isOffQueue ? [{ id: "verify", label: "Verification", icon: ShieldCheck }] : []),
  ];

  const secondaryLinks = [
    { id: "activity", label: "Activity Hub", icon: Activity },
    { id: "analytics", label: "Analytics Sector", icon: PieChart },
    { id: "cards", label: "Enterprise Assets", icon: CreditCard },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-96 h-screen sticky top-0 p-10 border-r border-black/5 dark:border-white/10 selection:bg-primary/20 bg-background/50 backdrop-blur-3xl overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-5 px-6 mb-20 cursor-pointer group" onClick={() => navigate("/")}>
        <div className="bg-primary p-3 rounded-2xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-xl shadow-primary/20">
           <RealloEyeLogo size={40} color="white" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-foreground uppercase tracking-[0.2em]">Reallo</span>
      </div>

      <div className="flex flex-col gap-20 flex-1">
        <div className="flex flex-col gap-6">
          <span className="text-[11px] uppercase tracking-[0.6em] font-black text-muted-foreground px-6 mb-4 opacity-60">Main Infrastructure</span>
          {mainLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onChange(link.id)}
              className={cn(
                "flex items-center gap-8 px-8 py-8 rounded-[40px] transition-all duration-500 group relative overflow-hidden active:scale-95",
                active === link.id
                  ? "bg-primary text-white shadow-2xl shadow-primary/40"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className={cn("w-7 h-7", active === link.id ? "text-white" : "text-primary group-hover:scale-110 transition-transform")} />
              <span className="text-[11px] font-black uppercase tracking-[0.5em]">{link.label}</span>
              {active === link.id && (
                <motion.div layoutId="sidebarActive" className="absolute inset-0 bg-primary -z-10" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <span className="text-[11px] uppercase tracking-[0.6em] font-black text-muted-foreground px-6 mb-4 opacity-60">Enterprise Hub</span>
          {secondaryLinks.map((link) => (
            <button
              key={link.id}
              className="flex items-center gap-8 px-8 py-8 rounded-[40px] transition-all duration-500 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 group active:scale-95"
            >
              <link.icon className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-[0.5em]">{link.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-6">
          <span className="text-[11px] uppercase tracking-[0.6em] font-black text-muted-foreground px-6 mb-4 opacity-60">User Sector</span>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-8 px-8 py-8 rounded-[40px] transition-all duration-500 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 group active:scale-95"
            >
              <Shield className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-[0.5em]">Admin Control</span>
            </button>
          )}
          <button className="flex items-center gap-8 px-8 py-8 rounded-[40px] transition-all duration-500 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 group active:scale-95">
            <User className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black uppercase tracking-[0.5em]">My Account</span>
          </button>
        </div>
      </div>

      <div className="mt-20 pt-12 border-t border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between px-8 mb-12">
          <div className="bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
             <ThemeToggle />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.6em]">Live Hub</span>
          </div>
        </div>
        <GlassButton
          variant="outline"
          onClick={async () => { await signOut(); navigate("/"); }}
          className="w-full h-20 rounded-[36px] flex items-center justify-center gap-5 border-black/10 dark:border-white/10 group bg-black/5 dark:bg-white/5 active:scale-95"
        >
          <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-[0.5em]">End Session</span>
        </GlassButton>
      </div>
    </aside>
  );
};

export default Sidebar;
