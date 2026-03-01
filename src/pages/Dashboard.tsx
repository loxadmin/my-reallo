import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import BottomNav from "@/components/BottomNav";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import QueueDisplay from "@/components/QueueDisplay";
import GlassCard from "@/components/GlassCard";
import { ChevronDown, TrendingUp, Target, ShieldCheck, Users } from "lucide-react";

type DashStep = "calculator" | "goal" | "queue";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<DashStep>("calculator");
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  // Determine starting step from profile
  useEffect(() => {
    if (profile) {
      if (profile.selected_goal && profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0,
          monthlyElectricity: 0,
          annualData: profile.annual_data_spend,
          annualElectricity: profile.annual_electricity_spend,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("queue");
      } else if (profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0,
          monthlyElectricity: 0,
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
      await supabase
        .from("profiles")
        .update({
          annual_data_spend: result.annualData,
          annual_electricity_spend: result.annualElectricity,
          total_annual_spend: result.totalAnnual,
        })
        .eq("id", user.id);
      await refreshProfile();
    }
    setStep("goal");
  };

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
    setStep("queue");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen pb-32">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <DashboardHeader />

      <main className="px-6 max-w-md mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {step === "queue" && spendResult && profile ? (
            <motion.div
              key="dashboard-home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Balance Display */}
              <section className="space-y-1">
                <motion.h1
                  className="text-5xl font-bold font-display tracking-tight text-foreground"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  {spendResult.totalAnnual.toLocaleString()}.00
                </motion.h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-4 bg-green-600 rounded-sm flex items-center justify-center text-[10px] font-bold text-white">NGN</div>
                  <span className="text-sm font-medium">NGN</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </section>

              {/* Action Grid */}
              <section>
                <p className="text-sm text-muted-foreground font-display mb-4">What do you want to do today?</p>
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard
                    className="layout-grid-item bg-indigo-500/10 border-indigo-500/20"
                    animate={false}
                    onClick={() => setStep("calculator")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground leading-tight">Reclaim money</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">To wallet or bank account</p>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="layout-grid-item bg-emerald-500/10 border-emerald-500/20"
                    animate={false}
                    onClick={() => setStep("goal")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground leading-tight">Request goal</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">Fund your life goals from Reallo</p>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="layout-grid-item bg-sky-500/10 border-sky-500/20"
                    animate={false}
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground leading-tight">Verify spend</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">Zero fees when you verify</p>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="layout-grid-item bg-amber-500/10 border-amber-500/20"
                    animate={false}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground leading-tight">Refer friends</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">Skip the queue across countries</p>
                    </div>
                  </GlassCard>
                </div>
              </section>

              {/* Recent Activity / Queue */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground font-display">Queue & Activity</p>
                  <button className="text-xs text-primary font-medium">See all</button>
                </div>
                <QueueDisplay
                  totalAnnualSpend={spendResult.totalAnnual}
                  goal={profile.selected_goal || ""}
                  targetAmount={profile.target_amount}
                  isIntegrated={true}
                />
              </section>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-4"
            >
              {step === "calculator" && <SpendCalculator onComplete={handleSpendComplete} />}
              {step === "goal" && spendResult && (
                <GoalSelector totalAnnualSpend={spendResult.totalAnnual} onSelect={handleGoalSelect} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
