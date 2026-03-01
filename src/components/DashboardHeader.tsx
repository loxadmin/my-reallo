import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const DashboardHeader = () => {
  const { profile } = useAuth();
  const firstName = profile?.email?.split('@')[0] || "there";

  return (
    <header className="px-6 pt-8 pb-4">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-muted-foreground font-display text-sm">Welcome back,</p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Hi {firstName.charAt(0).toUpperCase() + firstName.slice(1)},
          </h1>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-2 rounded-full glass-button"
        >
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
        </motion.button>
      </div>
    </header>
  );
};

export default DashboardHeader;
