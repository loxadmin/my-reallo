import { NavLink } from "react-router-dom";
import { LayoutDashboard, Award, Gift, ExternalLink, Calculator, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const { user, profile, isAdmin } = useAuth();
  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;

  if (!user) return null;

  const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
    { icon: Award, label: "Earn", path: "/earn" },
    { icon: Gift, label: "Goals", path: "/goals" },
    ...(isOffQueue ? [{ icon: ExternalLink, label: "Verify", path: "/verify" }] : []),
    ...(isAdmin ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
    { icon: Calculator, label: "Calc", path: "/calculator" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-around shadow-2xl border-white/10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-display font-medium uppercase tracking-tighter">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
