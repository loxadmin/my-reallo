import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";

const Dashboard = () => {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

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

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  const handleCalculatorComplete = async (result: any) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ total_annual_spend: result.totalAnnual })
      .eq("id", user.id);
    await refreshProfile();
  };

  const handleGoalSelect = async (goal: string, target: number) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ selected_goal: goal, target_amount: target })
      .eq("id", user.id);
    await refreshProfile();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Multi-step logic
  if (profile && (!profile.total_annual_spend || profile.total_annual_spend === 0)) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px] dark:bg-primary/3" />
        </div>
        <SpendCalculator onComplete={handleCalculatorComplete} />
      </div>
    );
  }

  if (profile && !profile.selected_goal) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[200px] dark:bg-primary/3" />
        </div>
        <GoalSelector
          totalAnnualSpend={profile.total_annual_spend || 0}
          onSelect={handleGoalSelect}
        />
      </div>
    );
  }

  return (
    <Layout>
      <section className="px-6 max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold gradient-text">Queue Status</h1>
        </header>

        {/* Queue Position Card */}
        <GlassCard variant="glow" className="text-center py-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
            {isOffQueue ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold gradient-text">You're Off the Queue!</h3>
                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                  Earn points, verify spend & claim your money.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-display mb-1">People ahead of you</p>
                <motion.h2 key={position} className="font-display text-5xl font-bold gradient-text">
                  {position}
                </motion.h2>
                <p className="text-sm text-muted-foreground mt-3">Skip the queue — refer a friend and move up 5 spots.</p>
              </div>
            )}
          </motion.div>
        </GlassCard>

        {/* Timer Card */}
        {!isOffQueue && (
          <GlassCard variant="strong" className="py-6 px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Next Queue Unlock</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {[
                { val: nextUnlock.hours, label: "Hours" },
                { val: nextUnlock.minutes, label: "Min" },
                { val: nextUnlock.seconds, label: "Sec" },
              ].map((t, i) => (
                <div key={t.label} className="flex items-center gap-3">
                   {i > 0 && <span className="font-display text-xl text-primary font-bold">:</span>}
                   <div className="text-center">
                    <p className="font-display text-2xl font-bold text-foreground">{String(t.val).padStart(2, "0")}</p>
                    <p className="text-[10px] text-muted-foreground">{t.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-primary" /> 10 users unlock & move up every day
            </p>
          </GlassCard>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, val: todaySkipped, label: "Skipped Today" },
            { icon: Share2, val: referralCount, label: "Referrals" },
            { icon: Users, val: isOffQueue ? "✓" : position, label: "Position" }
          ].map((stat, i) => (
            <GlassCard key={i} className="text-center p-4">
              <stat.icon className="w-4 h-4 text-primary mx-auto mb-1 opacity-80" />
              <p className="font-display font-bold text-foreground">{stat.val}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Referral Section */}
        <GlassCard variant="strong">
          <div className="relative z-10 space-y-4">
            <h3 className="font-display font-semibold text-foreground">
               {isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isOffQueue
                ? "Each referral earns you 1,000 points (₦500). Share your link!"
                : "For every friend you refer, skip 5 positions."}
            </p>

            {profile?.referral_code && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground mb-1 font-display">Your referral code</p>
                  <p className="font-display font-bold text-primary text-lg mb-3">{profile.referral_code}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 glass-input rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate">
                      {referralLink}
                    </div>
                    <GlassButton variant="outline" onClick={handleCopy} className="px-3 border-white/10">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </GlassButton>
                  </div>
                </div>

                <GlassButton variant="primary" className="w-full mt-4" onClick={handleShare}>
                  <Share2 className="inline w-4 h-4 mr-2" />
                  {isOffQueue ? "Share & Earn" : "Share Referral Link"}
                </GlassButton>
              </div>
            )}
          </div>
        </GlassCard>
      </section>
    </Layout>
  );
};

export default Dashboard;
