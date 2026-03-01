import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GoalSelector from "@/components/GoalSelector";

const GoalSelection = () => {
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
    <GoalSelector
      totalAnnualSpend={profile.total_annual_spend}
      onSelect={handleGoalSelect}
    />
  );
};

export default GoalSelection;
