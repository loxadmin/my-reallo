import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Award, Gift, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Award, label: "Earn", path: "/earn" },
    { icon: Gift, label: "Goals", path: "/goals" },
    { icon: ShieldCheck, label: "Verify", path: "/verify" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="max-w-md mx-auto glass rounded-[2.5rem] px-6 py-3 flex items-center justify-between shadow-2xl pointer-events-auto border-white/20 dark:border-white/10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 group relative py-1"
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary text-primary-foreground scale-110 shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-70"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
