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
      className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-4 lg:hidden"
      style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
    >
      <div className="max-w-md mx-auto glass-strong rounded-[24px] px-2 py-2 flex items-center justify-around shadow-2xl border-primary/10">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                active === item.id
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active === item.id && "stroke-[2.5px]")} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
