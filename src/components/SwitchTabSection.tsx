import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import { LayoutDashboard, Award, Target, ShieldCheck, PieChart, Activity, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashView = "home" | "earn" | "goal" | "verify";

interface SwitchTabSectionProps {
  active: DashView;
  onChange: (view: DashView) => void;
  showVerify: boolean;
}

const SwitchTabSection = ({ active, onChange, showVerify }: SwitchTabSectionProps) => {
  const items: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    { id: "goal", label: "Goal", icon: Target },
    ...(showVerify ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
  ];

  return (
    <GlassCard className="w-full py-24 px-12 flex flex-col md:flex-row items-center gap-24 rounded-[64px] border-black/5 dark:border-white/10 shadow-2xl shadow-black/5 bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="flex flex-col flex-1 w-full text-left">
        <div className="flex items-center gap-5 mb-10 bg-primary/10 border border-primary/20 rounded-full px-8 py-3 mx-auto md:mx-0 w-fit">
          <PieChart className="w-6 h-6 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-black text-primary">System Navigation Cluster</span>
        </div>
        <h3 className="text-4xl md:text-7xl font-black mb-6 text-foreground tracking-tighter leading-none text-center md:text-left">Switch Sectors</h3>
        <p className="text-[11px] md:text-sm text-muted-foreground uppercase tracking-[0.4em] font-black leading-relaxed opacity-60 text-center md:text-left">
           Seamlessly toggle between your financial dashboard index and earn sectors within the hub.
        </p>
      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-8 w-full md:w-fit bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-[48px] p-8 relative overflow-hidden shadow-inner">
         <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center gap-5 px-12 py-8 rounded-[36px] transition-all duration-500 min-w-[220px] justify-center group relative overflow-hidden",
                active === item.id
                  ? "bg-primary text-white shadow-2xl shadow-primary/40"
                  : "bg-white/10 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95"
              )}
            >
              <Icon className={cn("w-7 h-7 group-hover:scale-110 transition-transform", active === item.id ? "text-white" : "text-primary")} />
              <span className="text-[11px] font-black uppercase tracking-[0.4em]">{item.label}</span>
              {active === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default SwitchTabSection;
