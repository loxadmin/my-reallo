import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
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
      navigate("/dashboard");
    }
  };

  if (!profile || !profile.total_annual_spend) {
    navigate("/calculator");
    return null;
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-6 min-h-[80vh]">
        <div className="w-full">
          <GoalSelector
            totalAnnualSpend={profile.total_annual_spend}
            onSelect={handleGoalSelect}
          />
        </div>
      </div>
    </Layout>
  );
};

export default GoalSelection;
