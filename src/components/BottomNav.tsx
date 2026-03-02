import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Award, Target, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashView = "home" | "earn" | "goal" | "verify";

interface BottomNavProps {
  active: DashView;
  onChange: (view: DashView) => void;
  showVerify: boolean;
}

const BottomNav = ({ active, onChange, showVerify }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { id: "home", label: "Home", icon: LayoutDashboard, path: "/dashboard" },
    { id: "earn", label: "Earn", icon: Award, path: "/earn" },
    { id: "goal", label: "Goal", icon: Target, path: "/goals" },
    ...(showVerify ? [{ id: "verify", label: "Verify", icon: ShieldCheck, path: "/verify" }] : []),
  ];

  const handleNav = (item: typeof items[0]) => {
    navigate(item.path);
    onChange(item.id as DashView);
  };

  // Determine active item based on path
  const currentPath = location.pathname;
  const activeItem = items.find(item => item.path === currentPath)?.id || active;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-6"
      style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
    >
      <div className="max-w-md mx-auto glass-strong rounded-[2rem] px-2 py-2 flex items-center justify-around shadow-2xl border-white/10">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={cn(
                "flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl transition-all duration-300",
                isActive
                  ? "text-primary bg-primary/10 shadow-inner"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
