import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, Target, ShieldCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { icon: LayoutDashboard, label: "Hub", path: "/dashboard" },
    { icon: Wallet, label: "Earn", path: "/earn" },
    { icon: Target, label: "Goals", path: "/goals" },
    { icon: ShieldCheck, label: "Verify", path: "/verify" },
    { icon: Settings, label: "Vouchers", path: "/vouchers" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md">
      <div className="glass rounded-3xl p-2 flex items-center justify-around shadow-2xl border-white/10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )
            }
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
