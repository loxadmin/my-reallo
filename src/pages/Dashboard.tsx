import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import {
  Users, Share2, Copy, Check, TrendingUp, Clock, Zap, Award, Gift, ShieldCheck, CreditCard, ChevronRight, Bell, AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
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
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

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
    toast({ title: "Referral link copied!", description: "Share it to skip positions." });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground font-display animate-pulse">Loading...</p>
    </div>
  );

  if (!user) return null;

  // Onboarding flow checks
  if (!profile?.total_annual_spend || profile.total_annual_spend <= 0) {
    return (
      <div className="relative min-h-screen pt-20 px-6">
        <Navbar />
        <SpendCalculator onComplete={() => refreshProfile()} />
      </div>
    );
  }

  if (!profile?.selected_goal) {
    return (
      <div className="relative min-h-screen pt-20 px-6">
        <Navbar />
        <GoalSelector
          totalAnnualSpend={profile.total_annual_spend}
          onSelect={async (goal, target) => {
            await supabase.from("profiles").update({ selected_goal: goal, target_amount: target }).eq("id", user.id);
            await refreshProfile();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 overflow-x-hidden">
      <Navbar />

      <main className="pt-24 px-6 max-w-lg mx-auto space-y-8">
        {/* Header Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Hi {profile?.email.split('@')[0]},
            </h1>
            <button className="p-2 rounded-full glass hover:bg-muted/50 transition-colors">
              <Bell className="w-5 h-5 text-primary" />
            </button>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-display font-bold gradient-text tracking-tight">
              ₦{(profile?.points_balance * 0.5).toLocaleString()}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Live Balance
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/earn")} className="layout-grid-item">
            <Award className="w-8 h-8 text-primary mb-3" />
            <p className="font-display font-semibold text-sm">Earn Money</p>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Complete tasks for points</p>
          </button>
          <button onClick={() => navigate("/goals")} className="layout-grid-item">
            <Gift className="w-8 h-8 text-primary mb-3" />
            <p className="font-display font-semibold text-sm">My Goal</p>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Track your progress</p>
          </button>
          <button onClick={() => navigate("/verify")} className="layout-grid-item">
            <ShieldCheck className="w-8 h-8 text-primary mb-3" />
            <p className="font-display font-semibold text-sm">Verify Spend</p>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Submit proof of spend</p>
          </button>
          <button onClick={() => navigate("/vouchers")} className="layout-grid-item">
            <CreditCard className="w-8 h-8 text-primary mb-3" />
            <p className="font-display font-semibold text-sm">Vouchers</p>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Redeem your earnings</p>
          </button>
        </section>

        {/* Status Section */}
        <section className="space-y-4">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Queue Status
          </h3>

          <GlassCard variant="glow" className="flex items-center justify-between py-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-display">Queue Position</p>
              <h4 className="text-4xl font-display font-bold text-foreground">
                #{isOffQueue ? "0" : position}
              </h4>
            </div>
            {!isOffQueue && (
              <div className="text-right space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-display">Next Unlock</p>
                <p className="text-xl font-display font-bold text-primary tabular-nums">
                  {String(nextUnlock.hours).padStart(2, '0')}:
                  {String(nextUnlock.minutes).padStart(2, '0')}:
                  {String(nextUnlock.seconds).padStart(2, '0')}
                </p>
              </div>
            )}
            {isOffQueue && (
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            )}
          </GlassCard>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass p-4 rounded-2xl flex flex-col items-center gap-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-lg">{referralCount}</span>
              <span className="text-[9px] text-muted-foreground uppercase">Referrals</span>
            </div>
            <div className="glass p-4 rounded-2xl flex flex-col items-center gap-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-lg">{todaySkipped}</span>
              <span className="text-[9px] text-muted-foreground uppercase">Skipped</span>
            </div>
            <div className="glass p-4 rounded-2xl flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-lg">5x</span>
              <span className="text-[9px] text-muted-foreground uppercase">Boost</span>
            </div>
          </div>
        </section>

        {/* Referral Card */}
        <GlassCard variant="strong" className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">Refer & Skip</h3>
              <p className="text-sm text-muted-foreground">Every referral skips 5 positions.</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 glass px-4 py-3 rounded-xl font-mono text-sm text-muted-foreground truncate bg-muted/20">
              {referralLink}
            </div>
            <GlassButton onClick={handleCopy} className="px-4">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </GlassButton>
          </div>
        </GlassCard>

        {/* Recent Activity Placeholder (to match design sample's recent transactions) */}
        <section className="space-y-4">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Activity
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-14 h-14 rounded-full glass flex items-center justify-center text-primary font-display font-bold border-2 border-primary/20">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
            <button className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary/60">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
