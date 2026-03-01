import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import BottomNav from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (profile) {
        // Enforce onboarding flow: Calculator -> Goal -> Dashboard
        const isCalculatorComplete = profile.total_annual_spend > 0;
        const isGoalComplete = !!profile.selected_goal;

        const currentPath = window.location.pathname;

        if (!isCalculatorComplete && currentPath !== "/dashboard") {
          navigate("/dashboard");
        } else if (isCalculatorComplete && !isGoalComplete && currentPath !== "/dashboard") {
          navigate("/dashboard");
        }
      }
    }
  }, [loading, user, profile, navigate]);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-display font-medium animate-pulse">Loading Reallo...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[150px] opacity-50" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px] opacity-40" />
        <div className="absolute top-[30%] left-[-10%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] opacity-30" />
      </div>

      <DashboardHeader />

      <main className="relative z-10 pt-28 pb-32 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
