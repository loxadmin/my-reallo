import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import QueueDisplay from "@/components/QueueDisplay";
import WaterBackground from "@/components/WaterBackground";
import PageSkeleton from "@/components/PageSkeleton";
import KarbaliChat from "@/components/KarbaliChat";
import { LayoutDashboard, Award, ShieldCheck, Star, Bell, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";

export type DashView = "home" | "earn" | "tasks" | "surveys" | "goal" | "verify" | "influencer" | "notifications" | "chat";

const validViews: DashView[] = ["home", "earn", "tasks", "surveys", "goal", "verify", "influencer", "notifications", "chat"];

type DashStep = "onboarding" | "dashboard";

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

  const getInitialStep = (): DashStep => {
    if (profile?.selected_goal && profile?.total_annual_spend > 0) return "dashboard";
    return "onboarding";
  };

  const [step, setStep] = useState<DashStep>(getInitialStep);
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);
  const [profileReady, setProfileReady] = useState(false);

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
        setStep("dashboard");
      }
      setProfileReady(true);
    }
  }, [profile]);

  const handleOnboardingComplete = async () => {
    await refreshProfile();
    setStep("dashboard");
  };

  // Proactive assistant tip based on user state
  const proactiveTip = useMemo(() => {
    if (!profile) return undefined;
    const pos = profile.queue_position ?? 0;
    // Use a stable index based on date to avoid daily message flooding on every render
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

    if (pos > 0) {
      const tips = [
        `💡 Did you know? You can skip 20 queue positions by referring just one friend! Your code: **${profile.referral_code}**`,
        `🚀 You're at position #${pos}. Want to get off the queue faster? Share your referral link with friends!`,
        `📊 At the current rate, you could be off the queue in about ${Math.ceil(pos / 50)} days. Referrals can cut that dramatically!`,
      ];
      return tips[dayOfYear % tips.length];
    }
    if (pos <= 0) {
      const tips = [
        "🎉 You're off the queue! Head to **Verify** to submit your transaction IDs and start claiming your spend back.",
        `💰 Did you know you can earn points by referring friends? Each referral earns you **1,000 points** (₦500). Your code: **${profile.referral_code}**`,
        "📝 Complete surveys and tasks in the **Earn** tab to build up your points balance faster!",
      ];
      return tips[dayOfYear % tips.length];
    }
    return undefined;
  }, [profile?.id, profile?.queue_position, profile?.referral_code]);

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  if (loading || (!profileReady && user)) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <WaterBackground />
        <Navbar />
        <div className="flex pt-14">
          <main className="flex-1 w-full"><PageSkeleton /></main>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ─── Onboarding: Full-screen chat ───
  if (step === "onboarding") {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Navbar />
        <div className="pt-14">
          <KarbaliChat mode="fullscreen" onOnboardingComplete={handleOnboardingComplete} />
        </div>
      </div>
    );
  }

  // ─── Dashboard nav items ───
  const navItems: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    ...(isOffQueue ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
    { id: "influencer" as DashView, label: "Influencer", icon: Star },
    { id: "chat" as DashView, label: "Karbali", icon: MessageSquare },
    { id: "notifications" as DashView, label: "Alerts", icon: Bell },
  ];

  const isEarnActive = activeView === "earn" || activeView === "tasks" || activeView === "surveys";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar>
        {navItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] transition-colors",
              (activeView === item.id || (item.id === "earn" && isEarnActive)) ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.id === "notifications" && unreadCount > 0 && (
              <span className="ml-auto text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full leading-none">{unreadCount}</span>
            )}
          </DropdownMenuItem>
        ))}
      </Navbar>

      <div className="flex pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 z-30 p-4">
          <div className="glass-strong rounded-2xl p-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200",
                    (activeView === item.id || (item.id === "earn" && isEarnActive))
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.id === "notifications" && unreadCount > 0 && (
                    <span className="ml-auto text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full leading-none">{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className={cn("flex-1 w-full lg:ml-56")}>
          <AnimatePresence mode="wait">
            {activeView === "chat" ? (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <KarbaliChat mode="fullscreen" proactiveTip={proactiveTip} />
              </motion.div>
            ) : (
              <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {spendResult && profile && (
                  <QueueDisplay
                    totalAnnualSpend={spendResult.totalAnnual}
                    goal={profile.selected_goal || ""}
                    targetAmount={profile.target_amount}
                    view={activeView}
                    onViewChange={setActiveView}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
