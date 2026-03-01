import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import BottomNav from "@/components/BottomNav";
import GoalSelector from "@/components/GoalSelector";
import { ArrowLeft } from "lucide-react";

const GoalsPage = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

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

  if (loading || !user) return null;

  return (
    <div className="relative min-h-screen bg-background pb-32 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <DashboardHeader />

      <main className="max-w-lg mx-auto px-6 relative z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 text-sm text-muted-foreground font-display flex items-center gap-1 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        {profile && (
          <GoalSelector
            totalAnnualSpend={profile.total_annual_spend}
            onSelect={handleGoalSelect}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default GoalsPage;
