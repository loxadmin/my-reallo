import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GoalSelector from "@/components/GoalSelector";

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
      navigate("/dashboard");
    }
  };

  if (!profile) return null;

  return (
    <div className="pt-24 pb-32 flex items-center justify-center px-6">
      <GoalSelector
        totalAnnualSpend={profile.total_annual_spend}
        onSelect={handleGoalSelect}
      />
    </div>
  );
};

export default GoalSelectionPage;
