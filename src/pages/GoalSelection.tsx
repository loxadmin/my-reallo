import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GoalSelector from "@/components/GoalSelector";
import { motion } from "framer-motion";

const GoalSelection = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();

  const handleGoalSelect = async (goal: string, target: number) => {
    if (user) {
      await supabase
        .from("profiles")
        .update({
          selected_goal: goal,
          target_amount: target,
        })
        .eq("id", user.id);
      await refreshProfile();
      navigate("/dashboard");
    }
  };

  if (loading || !profile) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
      </div>

      <Navbar />

      <section className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-10 space-y-2">
            <h1 className="font-display text-3xl font-bold gradient-text">Select Goal</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Choose what you're reclaiming your utility spend toward.
            </p>
          </div>
          <GoalSelector totalAnnualSpend={profile.total_annual_spend} onSelect={handleGoalSelect} />
        </motion.div>
      </section>
    </div>
  );
};

export default GoalSelection;
