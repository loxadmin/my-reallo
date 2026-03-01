import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GoalSelector from "@/components/GoalSelector";
import Navbar from "@/components/Navbar";

const GoalSelectionPage = () => {
  const { user, profile, refreshProfile } = useAuth();
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
    }
    navigate("/dashboard");
  };

  if (!profile) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>
      <Navbar />
      <GoalSelector
        totalAnnualSpend={profile.total_annual_spend}
        onSelect={handleGoalSelect}
      />
    </div>
  );
};

export default GoalSelectionPage;
