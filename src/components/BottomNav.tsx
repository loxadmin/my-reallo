import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, ArrowLeftRight, Wallet, Smartphone, User } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutGrid, label: "Dashboard", path: "/dashboard" },
    { icon: ArrowLeftRight, label: "Transfer", path: "/vouchers" },
    { icon: Wallet, label: "Pay", path: "/admin" }, // Placeholder or Admin
    { icon: Smartphone, label: "Top Up", path: "#" },
    { icon: User, label: "Profile", path: "#" },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
    >
      <div className="max-w-md mx-auto glass-pill rounded-3xl p-2 flex items-center justify-around pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className="flex flex-col items-center gap-1 group relative py-1 flex-1"
            >
              <div
                className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                    : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-display font-medium transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default BottomNav;
