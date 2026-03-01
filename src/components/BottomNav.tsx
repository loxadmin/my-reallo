import { NavLink } from "react-router-dom";
import { LayoutDashboard, Award, Target, CheckCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/earn", icon: Award, label: "Earn" },
    { to: "/goals", icon: Target, label: "Goals" },
    { to: "/verify", icon: CheckCircle, label: "Verify" },
    { to: "/vouchers", icon: Wallet, label: "Wallet" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
      <div className="glass-strong rounded-3xl px-6 py-3 flex items-center justify-between shadow-2xl">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium font-display tracking-tight">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
