import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import QueueDisplay from "@/components/QueueDisplay";
import BottomNav, { type DashView } from "@/components/BottomNav";
import WaterBackground from "@/components/WaterBackground";
import { LayoutDashboard, Award, Target, ShieldCheck, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

type DashStep = "calculator" | "goal" | "queue";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const Dashboard = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
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
        <WaterBackground />
        <div className="glass-card rounded-2xl px-8 py-6">
          <p className="text-muted-foreground font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const sidebarItems: { id: DashView; label: string; icon: any }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    { id: "goal", label: "Goal", icon: Target },
    ...(isOffQueue ? [{ id: "verify", label: "Verify", icon: ShieldCheck } as any] : []),
  ];

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-background text-foreground">
      <WaterBackground />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-border glass p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Reallo</span>
        </div>

        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-[14px] transition-all duration-200 group",
                activeView === item.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeView === item.id ? "rotate-90" : "group-hover:translate-x-1")} />
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-border">
          <div className="flex items-center justify-between px-2">
            <span className="text-muted-foreground font-semibold">Appearance</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        <div className="lg:hidden h-16" /> {/* Spacer for Navbar on mobile */}
        <div className="lg:hidden"><Navbar /></div>

        <div className="w-full max-w-6xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${activeView}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
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
                  onViewChange={setActiveView}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Nav */}
        {step === "queue" && (
          <div className="lg:hidden">
            <BottomNav active={activeView} onChange={setActiveView} showVerify={isOffQueue} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
