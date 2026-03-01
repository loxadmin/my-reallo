import { NavLink } from "react-router-dom";
import { Home, Award, Gift, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const { profile } = useAuth();
  const isOffQueue = (profile?.queue_position ?? 201) <= 0;

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Award, label: "Earn", path: "/earn" },
    { icon: Gift, label: "Goal", path: "/goals" },
  ];

  if (isOffQueue) {
    navItems.push({ icon: CheckCircle, label: "Verify", path: "/verify" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 pointer-events-none">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="max-w-lg mx-auto glass rounded-[2rem] px-4 py-2 flex items-center justify-around pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 bg-background/20 backdrop-blur-2xl"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative group flex flex-col items-center gap-1.5 py-2 px-3 transition-all duration-500 rounded-2xl ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-primary/10 rounded-2xl blur-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "group-hover:scale-105"}`} />
                <span className={`text-[9px] font-display font-bold uppercase tracking-[0.15em] transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-60"}`}>
                  {item.label}
                </span>
                {isActive && (
                   <motion.div
                     layoutId="nav-dot"
                     className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(234,179,8,1)]"
                   />
                )}
              </>
            )}
          </NavLink>
        ))}
      </motion.div>
    </nav>
  );
};

export default BottomNav;
