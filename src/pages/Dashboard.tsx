import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import QueueDisplay from "@/components/QueueDisplay";
import WaterBackground from "@/components/WaterBackground";
import PageSkeleton from "@/components/PageSkeleton";
import { LayoutDashboard, Award, ShieldCheck, Star, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";

export type DashView = "home" | "earn" | "tasks" | "surveys" | "goal" | "verify" | "influencer" | "notifications";

const validViews: DashView[] = ["home", "earn", "tasks", "surveys", "goal", "verify", "influencer", "notifications"];

type DashStep = "calculator" | "goal" | "queue";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  weeklyFood?: number;
  weeklyTransport?: number;
  annualData: number;
  annualElectricity: number;
  annualFood?: number;
  annualTransport?: number;
  totalAnnual: number;
}

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { view: urlView } = useParams<{ view?: string }>();
  // Derive initial step from profile to prevent flash
  const getInitialStep = (): DashStep => {
    if (profile?.selected_goal && profile?.total_annual_spend > 0) return "queue";
    if (profile?.total_annual_spend > 0) return "goal";
    return "calculator";
  };

  const [step, setStep] = useState<DashStep>(getInitialStep);
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  // Derive activeView from URL param
  const activeView: DashView = urlView && validViews.includes(urlView as DashView)
    ? (urlView as DashView)
    : "home";

  const setActiveView = (view: DashView) => {
    if (view === "home") {
      navigate("/dashboard");
    } else {
      navigate(`/dashboard/${view}`);
    }
  };

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
          annualFood: profile.annual_food_spend ?? 0,
          annualTransport: profile.annual_transport_spend ?? 0,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("queue");
      } else if (profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0, monthlyElectricity: 0,
          annualData: profile.annual_data_spend,
          annualElectricity: profile.annual_electricity_spend,
          annualFood: profile.annual_food_spend ?? 0,
          annualTransport: profile.annual_transport_spend ?? 0,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("goal");
      }
      setProfileReady(true);
    }
  }, [profile]);

  const handleSpendComplete = async (result: SpendResult) => {
    setSpendResult(result);
    if (user) {
      await supabase.from("profiles").update({
        annual_data_spend: result.annualData,
        annual_electricity_spend: result.annualElectricity,
        annual_food_spend: result.annualFood ?? 0,
        annual_transport_spend: result.annualTransport ?? 0,
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

  if (loading || (!profileReady && user)) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <WaterBackground />
        <Navbar />
        <div className="flex pt-14">
          <main className="flex-1 w-full">
            <PageSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Sidebar nav items
  const navItems: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    ...(isOffQueue ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
    { id: "influencer" as DashView, label: "Influencer", icon: Star },
    { id: "notifications" as DashView, label: "Notifications", icon: Bell },
  ];

  const isEarnActive = activeView === "earn" || activeView === "tasks" || activeView === "surveys";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar>
        {step === "queue" && navItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors",
              (activeView === item.id || (item.id === "earn" && isEarnActive)) ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.id === "notifications" && unreadCount > 0 && (
              <span className="ml-auto text-[11px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">{unreadCount}</span>
            )}
          </DropdownMenuItem>
        ))}
      </Navbar>

      <div className="flex pt-14">
        {/* Desktop sidebar */}
        {step === "queue" && (
          <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 z-30 p-4">
            <div className="glass-strong rounded-2xl p-3 space-y-1 mt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 tracking-tight",
                      (activeView === item.id || (item.id === "earn" && isEarnActive))
                        ? "text-primary bg-primary/10 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.id === "notifications" && unreadCount > 0 && (
                      <span className="ml-auto text-[11px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full leading-none">{unreadCount}</span>
                    )}
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
