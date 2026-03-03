import { LayoutDashboard, Award, Target, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashView = "home" | "earn" | "goal" | "verify";

interface BottomNavProps {
  active: DashView;
  onChange: (view: DashView) => void;
  showVerify: boolean;
}

const BottomNav = ({ active, onChange, showVerify }: BottomNavProps) => {
  const items: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    { id: "goal", label: "Goal", icon: Target },
    ...(showVerify ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-6"
      style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
    >
      <div className="max-w-lg mx-auto glass-strong rounded-[32px] px-4 py-3 flex items-center justify-around shadow-2xl shadow-black/10 border-white/10 dark:border-white/5 backdrop-blur-3xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl transition-all duration-300 relative group",
                active === item.id
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-6 h-6 group-hover:scale-110 transition-transform", active === item.id ? "text-primary" : "text-primary opacity-60")} />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">{item.label}</span>
              {active === item.id && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
