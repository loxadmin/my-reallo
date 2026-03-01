import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import {
  Users,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Zap,
  Award,
  Gift,
  ShieldCheck,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, profile } = useAuth();
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
    if (profile && profile.total_annual_spend === 0) {
      navigate("/calculator");
    } else if (profile && !profile.selected_goal) {
      navigate("/goal-selection");
    }
  }, [profile, navigate]);

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
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = [
    { icon: Award, label: "Earn Points", path: "/earn", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Gift, label: "My Goals", path: "/goals", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: ShieldCheck, label: "Verify", path: "/verify", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Zap, label: "Activities", path: "#", color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="container max-w-md mx-auto px-6 space-y-8">
      {/* Spend Balance Card */}
      <GlassCard variant="blue" className="relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Zap size={120} />
        </div>
        <p className="text-white/70 text-sm font-medium mb-1">Annual Spend Balance</p>
        <h2 className="text-4xl font-bold text-white mb-6">
          ₦{profile?.total_annual_spend?.toLocaleString() || "0"}
        </h2>
        <div className="flex items-center gap-2 text-xs font-semibold bg-white/20 w-fit px-3 py-1.5 rounded-full">
          <TrendingUp size={14} />
          <span>Active Reclaim</span>
        </div>
      </GlassCard>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => action.path !== "#" && navigate(action.path)}
            className="layout-grid-item glass-card group"
          >
            <div className={`p-3 rounded-2xl ${action.bg} ${action.color} mb-3 transition-colors group-hover:bg-primary group-hover:text-white`}>
              <action.icon size={24} />
            </div>
            <span className="text-xs font-bold text-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Queue Status */}
      <GlassCard className="text-center relative">
        {!isOffQueue ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span className="text-sm font-bold text-foreground">Queue Status</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                <Clock size={12} />
                <span>{nextUnlock.hours}h {nextUnlock.minutes}m left</span>
              </div>
            </div>

            <div className="py-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-2">People ahead of you</p>
              <h3 className="text-6xl font-display font-bold text-primary mb-4 tracking-tight">
                {position}
              </h3>
              <p className="text-xs text-muted-foreground px-8 leading-relaxed">
                Unlock higher reclaim priority by moving up the queue. 10 spots moved every 24 hours.
              </p>
            </div>
          </>
        ) : (
          <div className="py-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <Check className="text-green-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Queue Completed!</h3>
            <p className="text-sm text-muted-foreground mb-6 px-4">
              You're now eligible to verify your expenses and claim your funds.
            </p>
            <GlassButton variant="primary" onClick={() => navigate("/verify")} className="w-full">
              Start Verification
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* Referral Link */}
      <GlassCard className="relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Share2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Invite Friends</h4>
            <p className="text-[10px] text-muted-foreground">Skip 5 spots per referral</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground truncate font-medium">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="p-3 bg-primary text-white rounded-xl active:scale-95 transition-transform"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{referralCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Referred</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{todaySkipped}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spots Skipped</p>
          </div>
        </div>
      </GlassCard>

      {/* Admin Quick Access */}
      <div className="flex justify-center pt-4">
        <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
          Reallo secure reclaim protocol v1.0.2 • Verified by blockchain
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
