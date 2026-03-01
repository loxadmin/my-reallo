import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import QueueDisplay from "@/components/QueueDisplay";

const Queue = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (profile && profile.total_annual_spend <= 0) navigate("/calculator");
    if (profile && !profile.selected_goal) navigate("/goals");
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile) return null;

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <div className="pt-24 pb-12">
        <QueueDisplay
          totalAnnualSpend={profile.total_annual_spend}
          goal={profile.selected_goal || ""}
          targetAmount={profile.target_amount}
        />
      </div>
    </div>
  );
};

export default Queue;
