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
import WaterBackground from "@/components/WaterBackground";
import { LayoutDashboard, Award, Target, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl px-8 py-6">
          <p className="text-muted-foreground text-[13px]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Desktop sidebar nav items
  const sidebarItems: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    { id: "goal", label: "Goal", icon: Target },
    ...(isOffQueue ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar />

      <div className="flex pt-16">
        {/* Desktop sidebar */}
        {step === "queue" && (
          <aside className="hidden lg:flex flex-col w-56 fixed top-16 left-0 bottom-0 z-30 p-4">
            <div className="glass-strong rounded-2xl p-3 space-y-1 mt-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                      activeView === item.id
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className={cn("flex-1 w-full", step === "queue" && "lg:ml-56")}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {step === "calculator" && <SpendCalculator onComplete={handleSpendComplete} />}
              {step === "goal" && spendResult && (
                <GoalSelector totalAnnualSpend={spendResult.totalAnnual} onSelect={handleGoalSelect} />
              )}
              {step === "queue" && spendResult && profile && (
                <>
                  <QueueDisplay
                    totalAnnualSpend={spendResult.totalAnnual}
                    goal={profile.selected_goal || ""}
                    targetAmount={profile.target_amount}
                    view={activeView}
                  />
                  <BottomNav active={activeView} onChange={setActiveView} showVerify={isOffQueue} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
