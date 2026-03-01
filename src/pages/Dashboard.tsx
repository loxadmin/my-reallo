import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import QueueDisplay from "@/components/QueueDisplay";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  // Handle onboarding redirection
  useEffect(() => {
    if (profile && !loading) {
      if (profile.total_annual_spend <= 0) {
        navigate("/calculator");
      } else if (!profile.selected_goal) {
        navigate("/goal-selection");
      }
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <QueueDisplay
          totalAnnualSpend={profile.total_annual_spend}
          goal={profile.selected_goal || ""}
          targetAmount={profile.target_amount}
        />
      </main>
    </div>
  );
};

export default Dashboard;
