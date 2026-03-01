import { NavLink } from "react-router-dom";
import { LayoutDashboard, Award, Gift, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const BottomNav = () => {
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Hub" },
    { to: "/earn", icon: Award, label: "Earn" },
    { to: "/goals", icon: Gift, label: "Goals" },
    { to: "/vouchers", icon: CreditCard, label: "Vouchers" },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none"
    >
      <nav className="max-w-lg mx-auto glass rounded-2xl p-2 flex items-center justify-around pointer-events-auto shadow-2xl">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-display font-medium uppercase tracking-wider">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </motion.div>
  );
};

export default BottomNav;
