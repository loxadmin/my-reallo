import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import QueueDisplay from "@/components/QueueDisplay";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (profile) {
        // Enforce onboarding flow logic
        if (!profile.total_annual_spend || profile.total_annual_spend === 0) {
          navigate("/calculator");
        } else if (!profile.selected_goal) {
          navigate("/goal-selection");
        }
      }
    }
  }, [loading, user, profile, navigate]);

  if (loading || !profile || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome back, <span className="gradient-text">{profile.email.split('@')[0]}</span>
          </h1>
        </header>

        <QueueDisplay
          totalAnnualSpend={profile.total_annual_spend}
          goal={profile.selected_goal || ""}
          targetAmount={profile.target_amount}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
