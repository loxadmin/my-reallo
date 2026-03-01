import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import DashboardLayout from "@/components/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Users, Clock, Zap, Share2, Copy, Check, Award, Target, CheckCircle, Ticket, ChevronDown, Plus } from "lucide-react";
import { motion } from "framer-motion";

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
  const [copied, setCopied] = useState(false);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (profile) {
      if (profile.selected_goal && profile.total_annual_spend > 0) {
        setStep("queue");
      } else if (profile.total_annual_spend > 0) {
        setStep("goal");
      }
    }
  }, [profile]);

  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      setNextUnlock({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calcTimeLeft();
    const interval = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleCopy = () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "calculator") {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <SpendCalculator onComplete={handleSpendComplete} />
      </div>
    );
  }

  if (step === "goal") {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <GoalSelector
          totalAnnualSpend={profile?.total_annual_spend || spendResult?.totalAnnual || 0}
          onSelect={handleGoalSelect}
        />
      </div>
    );
  }

  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-8">
        {/* Main Stat: Queue Position - Re-styled to match sample balance view */}
        <div className="px-1 pt-2">
           <p className="text-4xl font-bold font-display tracking-tight text-foreground/90">
             {isOffQueue ? "READY" : position.toLocaleString()}
           </p>
           <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-4 bg-primary/20 rounded-sm overflow-hidden flex items-center justify-center">
                 <div className="w-full h-1/3 bg-[#008751]" />
                 <div className="w-full h-1/3 bg-white" />
                 <div className="w-full h-1/3 bg-[#008751]" />
              </div>
              <span className="text-sm font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wide">
                Queue <ChevronDown className="w-4 h-4" />
              </span>
           </div>
        </div>

        <div className="space-y-6">
          <p className="text-lg font-medium text-foreground/80 px-1">What do you want to do today?</p>

          {/* Action Grid - Styled to match sample cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/earn")}
              className="layout-grid-item bg-[#E5DEFF] dark:bg-[#E5DEFF]/10 border-none text-left p-6"
            >
              <div className="mb-auto">
                <Award className="w-8 h-8 text-[#583AFE]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1A1C1E] dark:text-white leading-tight">Earn</h3>
                <p className="text-xs text-[#1A1C1E]/60 dark:text-white/60 mt-2 font-medium">Earn points & move up</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/goals")}
              className="layout-grid-item bg-[#F2FCE2] dark:bg-[#F2FCE2]/10 border-none text-left p-6"
            >
              <div className="mb-auto">
                <Target className="w-8 h-8 text-[#0EADC1]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1A1C1E] dark:text-white leading-tight">Goal</h3>
                <p className="text-xs text-[#1A1C1E]/60 dark:text-white/60 mt-2 font-medium">View your target</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/verify")}
              className="layout-grid-item bg-[#D3E4FD] dark:bg-[#D3E4FD]/10 border-none text-left p-6"
            >
              <div className="mb-auto">
                <CheckCircle className="w-8 h-8 text-[#0061A4]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1A1C1E] dark:text-white leading-tight">Verify</h3>
                <p className="text-xs text-[#1A1C1E]/60 dark:text-white/60 mt-2 font-medium">Authenticate spend</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/vouchers")}
              className="layout-grid-item bg-[#FEF7CD] dark:bg-[#FEF7CD]/10 border-none text-left p-6"
            >
              <div className="mb-auto">
                <Ticket className="w-8 h-8 text-[#A97B00]" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-[#1A1C1E] dark:text-white leading-tight">Vouchers</h3>
                <p className="text-xs text-[#1A1C1E]/60 dark:text-white/60 mt-2 font-medium">Manage your claims</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4">
           <h3 className="text-lg font-medium text-foreground/80 px-1">Recent activity</h3>
           <div className="flex gap-4 px-1">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border-2 border-dashed border-primary/40">
                 <Plus className="w-6 h-6 text-primary" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative">
                  <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-background">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i+10}`} alt="user" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-background bg-[#008751]" />
                </div>
              ))}
           </div>
        </div>

        {/* Mandatory: Timer */}
        {!isOffQueue && (
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display uppercase tracking-widest text-xs">Next Queue Unlock</h3>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 py-2">
              {[
                { val: nextUnlock.hours, label: "Hours" },
                { val: nextUnlock.minutes, label: "Minutes" },
                { val: nextUnlock.seconds, label: "Seconds" },
              ].map((t, i) => (
                <div key={t.label} className="flex items-center gap-4">
                  {i > 0 && <span className="text-2xl font-bold text-muted-foreground/30">:</span>}
                  <div className="text-center min-w-[60px]">
                    <p className="text-3xl font-bold font-display text-foreground leading-none">
                      {String(t.val).padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">{t.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-primary fill-primary" />
              <p className="text-xs text-muted-foreground font-medium">10 users unlock & move up every day</p>
            </div>
          </GlassCard>
        )}

        {/* Mandatory: Referral Link */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
               <Share2 className="w-5 h-5 text-primary" />
             </div>
             <div>
               <h3 className="font-bold font-display">{isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}</h3>
               <p className="text-xs text-muted-foreground font-medium">
                 {isOffQueue
                   ? "Each referral earns you 1,000 points (₦500). Share your link!"
                   : "For every friend you refer, skip 5 positions."}
               </p>
             </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 glass-input rounded-2xl px-4 py-3 text-xs text-muted-foreground font-medium truncate flex items-center">
              {profile?.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : 'Generating...'}
            </div>
            <button
              onClick={handleCopy}
              className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground hover:brightness-110 transition-all active:scale-95"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <GlassButton variant="primary" className="w-full py-4 rounded-2xl" onClick={() => {
            if (navigator.share && profile?.referral_code) {
               navigator.share({
                 title: 'Join Reallo',
                 text: 'Reclaim your utility spend!',
                 url: `${window.location.origin}/auth?ref=${profile.referral_code}`
               });
            } else {
               handleCopy();
            }
          }}>
            <Share2 className="w-4 h-4 mr-2" /> {isOffQueue ? "Share & Earn" : "Share Referral Link"}
          </GlassButton>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
