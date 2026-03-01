import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import GoalSelector from "@/components/GoalSelector";
import { supabase } from "@/integrations/supabase/client";

const Goals = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (profile && profile.total_annual_spend <= 0) navigate("/calculator");
  }, [loading, user, profile, navigate]);

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
      navigate("/queue");
    }
  };

  if (loading || !user || !profile) return null;

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <div className="pt-24">
        <GoalSelector totalAnnualSpend={profile.total_annual_spend} onSelect={handleGoalSelect} />
      </div>
    </div>
  );
};

export default Goals;
