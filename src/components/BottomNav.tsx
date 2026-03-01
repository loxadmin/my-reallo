import { useNavigate, useLocation } from "react-router-dom";
import { Home, Award, Gift, ExternalLink, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Award, label: "Earn", path: "/earn" },
    { icon: Gift, label: "Goals", path: "/goals" },
    { icon: ExternalLink, label: "Verify", path: "/verify", hidden: !isOffQueue },
    { icon: Wallet, label: "Vouchers", path: "/vouchers" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass rounded-2xl px-2 py-2 flex items-center justify-around shadow-2xl">
        {navItems.filter(item => !item.hidden).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              <span className="text-[10px] font-display font-medium uppercase tracking-wider">
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
