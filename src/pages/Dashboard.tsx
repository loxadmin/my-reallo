import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import {
  Users, Award, Target, CheckCircle, Wallet,
  Share2, Copy, Check, Clock, Zap, TrendingUp,
  ArrowUpRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

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

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile || !user) return;
      const [refRes, actRes] = await Promise.all([
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
        supabase.from("waitlist_activity").select("positions_moved").eq("user_id", profile.id).gte("created_at", new Date().toISOString().split("T")[0]),
      ]);
      setReferralCount(refRes.count || 0);
      setTodaySkipped((actRes.data || []).reduce((sum, a) => sum + (a.positions_moved || 0), 0));
    };
    fetchStats();
  }, [profile, user]);

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
    const referralLink = profile?.referral_code
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const referralLink = profile?.referral_code
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";
    if (navigator.share) {
      await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;
  const pointsBalance = profile?.points_balance ?? 0;
  const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {step === "calculator" && <SpendCalculator onComplete={handleSpendComplete} />}
          {step === "goal" && spendResult && (
            <GoalSelector totalAnnualSpend={spendResult.totalAnnual} onSelect={handleGoalSelect} />
          )}

          {step === "queue" && profile && (
            <div className="space-y-6">
              {/* Header section with greeting and Balance */}
              <div className="space-y-4">
                <header className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground font-display">Welcome back,</p>
                    <h2 className="text-2xl font-display font-bold text-foreground truncate max-w-[200px]">
                      {profile.email.split('@')[0]}
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-full glass-strong flex items-center justify-center border border-primary/20">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </header>

                <GlassCard variant="strong" className="py-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <div className="glass-pill px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
                      <span className="text-[10px] font-display font-bold text-primary uppercase tracking-tighter">Active</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1">Total Annual Spend</p>
                  <p className="text-5xl font-display font-bold gradient-text">{formatNaira(profile.total_annual_spend)}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="glass-pill px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-primary" />
                      <span className="text-xs font-display font-medium text-foreground">{pointsBalance.toLocaleString()} pts</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Grid Actions */}
              <section className="grid grid-cols-2 gap-4">
                <button onClick={() => navigate("/earn")} className="group">
                  <GlassCard className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 group-hover:bg-primary/5 transition-colors duration-300 border-primary/10">
                    <div className="p-3 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm">Earn Points</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Complete surveys & refer</p>
                    </div>
                  </GlassCard>
                </button>
                <button onClick={() => navigate("/goals")} className="group">
                  <GlassCard className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 group-hover:bg-primary/5 transition-colors duration-300 border-primary/10">
                    <div className="p-3 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm">My Goals</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Monitor your progress</p>
                    </div>
                  </GlassCard>
                </button>
                <button onClick={() => navigate("/verify")} className="group">
                  <GlassCard className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 group-hover:bg-primary/5 transition-colors duration-300 border-primary/10">
                    <div className="p-3 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm">Verify Spend</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Authenticate utility bills</p>
                    </div>
                  </GlassCard>
                </button>
                <button onClick={() => navigate("/vouchers")} className="group">
                  <GlassCard className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 group-hover:bg-primary/5 transition-colors duration-300 border-primary/10">
                    <div className="p-3 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm">Wallet</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Manage your vouchers</p>
                    </div>
                  </GlassCard>
                </button>
              </section>

              {/* Queue Status Section */}
              <GlassCard variant="glow" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Queue Status
                  </h3>
                  {isOffQueue ? (
                    <span className="glass-pill px-2.5 py-1 rounded-full text-[10px] font-bold text-primary uppercase">Completed</span>
                  ) : (
                    <div className="flex gap-1.5">
                      {['H', 'M', 'S'].map((l, i) => (
                        <div key={l} className="flex items-center gap-1">
                          <span className="text-sm font-bold font-display">
                            {String([nextUnlock.hours, nextUnlock.minutes, nextUnlock.seconds][i]).padStart(2, '0')}
                          </span>
                          <span className="text-[8px] text-muted-foreground font-display font-bold">{l}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center space-y-1">
                    <p className="text-[9px] text-muted-foreground font-display uppercase tracking-widest">Position</p>
                    <p className="font-display font-bold text-xl text-foreground">{isOffQueue ? "✓" : position}</p>
                  </div>
                  <div className="text-center space-y-1 border-x border-primary/10">
                    <p className="text-[9px] text-muted-foreground font-display uppercase tracking-widest">Skipped</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="font-display font-bold text-xl text-foreground">{todaySkipped}</p>
                      <TrendingUp className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[9px] text-muted-foreground font-display uppercase tracking-widest">Referrals</p>
                    <p className="font-display font-bold text-xl text-foreground">{referralCount}</p>
                  </div>
                </div>

                {!isOffQueue && (
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-start gap-3">
                    <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Next unlock in <span className="text-foreground font-bold">{nextUnlock.hours}h {nextUnlock.minutes}m</span>. 10 users move up every day.
                    </p>
                  </div>
                )}
              </GlassCard>

              {/* Referral Section */}
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg">Spread the Word</h3>
                    <p className="text-xs text-muted-foreground">Refer friends to skip 5 spots.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Share2 className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 glass-input rounded-xl px-4 py-3 text-xs text-muted-foreground truncate font-display">
                    {profile.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "Loading..."}
                  </div>
                  <GlassButton variant="outline" onClick={handleCopy} className="px-4 py-3 h-auto">
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </GlassButton>
                </div>

                <GlassButton variant="primary" className="w-full py-4 text-sm font-display font-bold" onClick={handleShare}>
                  Share Referral Link
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default Dashboard;
