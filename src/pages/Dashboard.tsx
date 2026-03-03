import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import QueueDisplay from "@/components/QueueDisplay";
import BottomNav, { type DashView } from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

type DashStep = "calculator" | "goal" | "queue";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<DashStep>("calculator");
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);
  const [activeView, setActiveView] = useState<DashView>("home");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.selected_goal && profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0, monthlyElectricity: 0,
          annualData: profile.annual_data_spend,
          annualElectricity: profile.annual_electricity_spend,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("queue");
      } else if (profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0, monthlyElectricity: 0,
          annualData: profile.annual_data_spend,
          annualElectricity: profile.annual_electricity_spend,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("goal");
      }
    }
  }, [profile]);

  const handleSpendComplete = async (result: SpendResult) => {
    setSpendResult(result);
    if (user) {
      await supabase.from("profiles").update({
        annual_data_spend: result.annualData,
        annual_electricity_spend: result.annualElectricity,
        total_annual_spend: result.totalAnnual,
      }).eq("id", user.id);
      await refreshProfile();
    }
    setStep("goal");
  };

  const handleGoalSelect = async (goal: string, target: number) => {
    if (user) {
      await supabase.from("profiles").update({
        selected_goal: goal, target_amount: target,
      }).eq("id", user.id);
      await refreshProfile();
    }
    setStep("queue");
  };

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <GlassCard variant="strong" className="px-12 py-8 rounded-3xl">
          <p className="text-muted-foreground font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Initializing System...</p>
        </GlassCard>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background system */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/2 opacity-50 blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/3 blur-[160px] rounded-full" />
      </div>

      <div className="flex relative z-10">
        {/* Sidebar - Desktop Only */}
        <Sidebar active={activeView} onChange={setActiveView} />

        <main className="flex-1 min-h-screen">
          <Navbar />

          <div className="pt-32 pb-40">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                {step === "calculator" && <SpendCalculator onComplete={handleSpendComplete} />}
                {step === "goal" && spendResult && (
                  <GoalSelector totalAnnualSpend={spendResult.totalAnnual} onSelect={handleGoalSelect} />
                )}
                {step === "queue" && spendResult && profile && (
                  <QueueDisplay
                    totalAnnualSpend={spendResult.totalAnnual}
                    goal={profile.selected_goal || ""}
                    targetAmount={profile.target_amount}
                    view={activeView}
                    onChangeView={setActiveView}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {step === "queue" && (
        <div className="lg:hidden">
           <BottomNav active={activeView} onChange={setActiveView} showVerify={isOffQueue} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
