import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppDesign } from "@/contexts/AppDesignContext";
import Navbar from "@/components/Navbar";
import QueueDisplay from "@/components/QueueDisplay";
import WaterBackground from "@/components/WaterBackground";
import PageSkeleton from "@/components/PageSkeleton";
import KarbaliChat from "@/components/KarbaliChat";
import { ChatPopup } from "@/components/KarbaliChat";
import DashboardBold from "@/components/dashboard/DashboardBold";
import DashboardMinimal from "@/components/dashboard/DashboardMinimal";
import DashboardNeon from "@/components/dashboard/DashboardNeon";
import DashboardCards from "@/components/dashboard/DashboardCards";
import { LayoutDashboard, Award, ShieldCheck, Star, Bell, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/NotificationContext";

export type DashView = "home" | "earn" | "tasks" | "surveys" | "goal" | "verify" | "influencer" | "notifications" | "chat" | "profile";

const validViews: DashView[] = ["home", "earn", "tasks", "surveys", "goal", "verify", "influencer", "notifications", "chat", "profile"];

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
  const { activeDesign } = useAppDesign();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { view: urlView } = useParams<{ view?: string }>();

  const getInitialStep = (p: typeof profile): DashStep => {
    if (p?.selected_goal && p?.total_annual_spend && p.total_annual_spend > 0) return "dashboard";
    return "onboarding";
  };

  const getInitialSpendResult = (p: typeof profile): SpendResult | null => {
    if (p?.selected_goal && p?.total_annual_spend && p.total_annual_spend > 0) {
      return {
        weeklyData: 0, monthlyElectricity: 0,
        annualData: p.annual_data_spend ?? 0,
        annualElectricity: p.annual_electricity_spend ?? 0,
        annualFood: p.annual_food_spend ?? 0,
        annualTransport: p.annual_transport_spend ?? 0,
        totalAnnual: p.total_annual_spend,
      };
    }
    return null;
  };

  const [step, setStep] = useState<DashStep>(() => getInitialStep(profile));
  const [spendResult, setSpendResult] = useState<SpendResult | null>(() => getInitialSpendResult(profile));

  const activeView: DashView = urlView && validViews.includes(urlView as DashView)
    ? (urlView as DashView)
    : "home";

  const setActiveView = (view: DashView) => {
    if (view === "home") navigate("/dashboard");
    else navigate(`/dashboard/${view}`);
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.selected_goal && profile.total_annual_spend && profile.total_annual_spend > 0) {
        setSpendResult({
          weeklyData: 0, monthlyElectricity: 0,
          annualData: profile.annual_data_spend ?? 0,
          annualElectricity: profile.annual_electricity_spend ?? 0,
          annualFood: profile.annual_food_spend ?? 0,
          annualTransport: profile.annual_transport_spend ?? 0,
          totalAnnual: profile.total_annual_spend,
        });
        setStep("dashboard");
      } else {
        setSpendResult(null);
        setStep("onboarding");
      }
    }
  }, [profile]);

  const handleOnboardingComplete = async () => {
    await refreshProfile();
    setStep("dashboard");
  };

  const proactiveTip = useMemo(() => {
    if (!profile) return undefined;
    const pos = profile.queue_position ?? 0;
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

    if (pos > 0) {
      const tips = [
        `💡 Did you know? You can skip 20 queue positions by referring just one friend! Your code: **${profile.referral_code}**`,
        `🚀 You're at position #${pos}. Want to get off the queue faster? Share your referral link with friends!`,
        `💰 Did you know you can earn money as a Karbali influencer? Check the Influencer tab to apply!`,
      ];
      return tips[dayOfYear % tips.length];
    }
    if (pos <= 0) {
      const tips = [
        "🎉 You're off the queue! Head to **Verify** to submit your transaction IDs and start claiming your spend back.",
        `💰 Earn ₦500 per friend who joins! Your referral code: **${profile.referral_code}**`,
        "📝 Complete surveys and tasks in the **Earn** tab to build up your points faster!",
        "🌟 Want to earn more? Apply to become a Karbali influencer in the Influencer tab!",
      ];
      return tips[dayOfYear % tips.length];
    }
    return undefined;
  }, [profile?.id, profile?.queue_position, profile?.referral_code]);

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <WaterBackground />
        <Navbar />
        <div className="relative z-10 flex pt-14">
          <main className="flex-1 w-full"><PageSkeleton /></main>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <WaterBackground />
        <Navbar />
        <div className="relative z-10 px-4 pt-24">
          <div className="mx-auto max-w-md bg-card rounded-2xl p-6 text-center border border-border shadow-sm">
            <h2 className="text-[15px] font-semibold text-foreground">We couldn't load your account yet</h2>
            <p className="mt-2 text-[12px] text-muted-foreground">Please retry loading your dashboard.</p>
            <button onClick={() => void refreshProfile()} className="mt-4 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-[12px] font-medium">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "onboarding") {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-background">
        <Navbar />
        <div className="relative z-10 pt-14">
          <KarbaliChat mode="fullscreen" onOnboardingComplete={handleOnboardingComplete} />
        </div>
      </div>
    );
  }

  const navItems: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "earn", label: "Earn", icon: Award },
    ...(isOffQueue ? [{ id: "verify" as DashView, label: "Verify", icon: ShieldCheck }] : []),
    { id: "influencer" as DashView, label: "Influencer", icon: Star },
    { id: "chat" as DashView, label: "Karbali", icon: MessageSquare },
    { id: "notifications" as DashView, label: "Alerts", icon: Bell },
    { id: "profile" as DashView, label: "Profile", icon: User },
  ];

  const isEarnActive = activeView === "earn" || activeView === "tasks" || activeView === "surveys";

  const renderHomeDashboard = () => {
    switch (activeDesign) {
      case "bold": return <DashboardBold />;
      case "minimal": return <DashboardMinimal />;
      case "neon": return <DashboardNeon />;
      case "cards": return <DashboardCards />;
      default:
        return spendResult && profile ? (
          <QueueDisplay
            totalAnnualSpend={spendResult.totalAnnual}
            goal={profile.selected_goal || ""}
            targetAmount={profile.target_amount ?? 0}
            view="home"
            onViewChange={setActiveView}
          />
        ) : null;
    }
  };

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

      <div className="relative z-10 flex pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 z-30 p-4">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3 space-y-1 mt-2 border border-border/50">
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

        <main className={cn("relative z-10 flex-1 w-full lg:ml-56")}>
          {activeView === "chat" ? (
            <div key="chat">
              <KarbaliChat mode="fullscreen" proactiveTip={proactiveTip} />
            </div>
          ) : activeView === "home" ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {renderHomeDashboard()}
            </motion.div>
          ) : (
            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {spendResult && profile && (
                <QueueDisplay
                  totalAnnualSpend={spendResult.totalAnnual}
                  goal={profile.selected_goal || ""}
                  targetAmount={profile.target_amount ?? 0}
                  view={activeView}
                  onViewChange={setActiveView}
                />
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Floating chat popup on home view */}
      {activeView === "home" && (
        <ChatPopup proactiveTip={proactiveTip} />
      )}
    </div>
  );
};

export default Dashboard;
