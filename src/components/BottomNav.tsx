import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Target, Gift, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Reclaim", icon: Zap, path: "/calculator" },
    { label: "Goals", icon: Target, path: "/goals" },
    { label: "Queue", icon: Users, path: "/queue" },
    { label: "Vouchers", icon: Gift, path: "/vouchers" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto glass-strong rounded-3xl px-6 py-3 flex items-center justify-between pointer-events-auto shadow-2xl border border-white/5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/20 text-primary" : "text-muted-foreground group-hover:text-primary/70"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-display font-medium transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
