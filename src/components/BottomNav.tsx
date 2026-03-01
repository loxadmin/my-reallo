import { NavLink } from "react-router-dom";
import { LayoutDashboard, Award, Target, CheckCircle, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Award, label: "Earn", path: "/earn" },
    { icon: Target, label: "Goals", path: "/goals" },
    { icon: CheckCircle, label: "Verify", path: "/verify" },
    { icon: Ticket, label: "Vouchers", path: "/vouchers" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-t border-border/10 pb-8 pt-4 px-6 sm:pb-6">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground opacity-70 hover:opacity-100"
              )
            }
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              "bg-muted/30"
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold font-display uppercase tracking-widest leading-none">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
