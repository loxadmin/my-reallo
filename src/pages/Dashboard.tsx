import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import QueueDisplay from "@/components/QueueDisplay";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.total_annual_spend === 0) {
        navigate("/calculator");
      } else if (!profile.selected_goal) {
        navigate("/goal-selection");
      }
    }
  }, [profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display">Loading...</p>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="pt-24 pb-32">
      <QueueDisplay
        totalAnnualSpend={profile.total_annual_spend}
        goal={profile.selected_goal || ""}
        targetAmount={profile.target_amount}
      />
    </div>
  );
};

export default Dashboard;
