import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const DashboardHeader = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "User";

  return (
    <header className="w-full flex items-center justify-between py-6 px-6 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-muted-foreground font-display text-base">Hi {firstName},</p>
      </motion.div>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-10 h-10 rounded-full glass-button flex items-center justify-center relative"
      >
        <Bell className="w-5 h-5 text-primary" />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
      </motion.button>
    </header>
  );
};

export default DashboardHeader;
