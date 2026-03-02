import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import {
  Users, Share2, Copy, Check, Clock, Zap, Wallet,
  Target, Award, ShieldCheck, ArrowUpRight, Bell
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [claimedTotal, setClaimedTotal] = useState(0);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.total_annual_spend <= 0) {
        navigate("/calculator");
      } else if (!profile.selected_goal) {
        navigate("/goal-selection");
      }
    }
  }, [profile, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchStats();
  }, [user]);

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

  const handleCopy = () => {
    if (!profile?.referral_code) return;
    const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with your friends." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !profile || !user) return null;

  const claimableAmount = Math.max(0, profile.total_annual_spend - claimedTotal);
  const isOffQueue = (profile.queue_position ?? 999) <= 0;
  const pointsBalance = profile.points_balance ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-32">
      <Navbar />

      <main className="max-w-md mx-auto px-6 pt-24 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">Hi {user.email?.split('@')[0]},</p>
            <h1 className="text-2xl font-bold font-display">Welcome Back</h1>
          </div>
          <button className="w-10 h-10 rounded-full glass-button flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-semibold">Claimable Balance</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-bold font-display">{formatNaira(claimableAmount).replace('₦', '')}</h2>
                <span className="text-sm font-bold text-muted-foreground">NGN</span>
              </div>
            </div>
            <GlassButton
              variant="primary"
              className="px-6 py-2.5 rounded-2xl text-sm font-bold shadow-lg"
              onClick={() => navigate("/vouchers")}
            >
              Claim
            </GlassButton>
          </div>
          <button
            onClick={() => navigate("/verify")}
            className="flex items-center gap-2 text-primary text-xs font-bold hover:opacity-80 transition-opacity"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify Amount Function
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Queue Status */}
          <div
            onClick={() => {}}
            className="layout-grid-item bg-primary/10 border-primary/20"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="mt-auto">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Queue Status</p>
              <h3 className="text-lg font-bold mt-1">{isOffQueue ? "Completed" : `#${profile.queue_position}`}</h3>
              {!isOffQueue && (
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  Next: {String(nextUnlock.hours).padStart(2, '0')}:{String(nextUnlock.minutes).padStart(2, '0')}:{String(nextUnlock.seconds).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>

          {/* Goal Progress */}
          <div
            onClick={() => navigate("/goals")}
            className="layout-grid-item bg-blue-500/10 border-blue-500/20"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="mt-auto">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Your Goal</p>
              <h3 className="text-lg font-bold mt-1 capitalize">{profile.selected_goal}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                {Math.round((claimableAmount / (profile.target_amount || 1)) * 100)}% Reclaimed
              </p>
            </div>
          </div>

          {/* Points / Earn */}
          <div
            onClick={() => navigate("/earn")}
            className="layout-grid-item bg-green-500/10 border-green-500/20"
          >
            <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-green-500" />
            </div>
            <div className="mt-auto">
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Earn Points</p>
              <h3 className="text-lg font-bold mt-1">{pointsBalance.toLocaleString()} pts</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">Complete tasks</p>
            </div>
          </div>

          {/* Referral */}
          <div
            onClick={handleCopy}
            className="layout-grid-item bg-purple-500/10 border-purple-500/20"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-auto">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider">Referral Link</p>
              <h3 className="text-lg font-bold mt-1">{profile.referral_code}</h3>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium mt-1">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Click to copy"}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity placeholder (from design sample) */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Recent Updates</h3>
          <div className="space-y-3">
            <GlassCard className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">Queue Moved Up</p>
                <p className="text-xs text-muted-foreground">10 positions moved today</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">2h ago</p>
            </GlassCard>
            <GlassCard className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">Points Rewarded</p>
                <p className="text-xs text-muted-foreground">Daily activity bonus</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">5h ago</p>
            </GlassCard>
          </div>
        </div>
      </main>

      <BottomNav active="home" onChange={() => {}} showVerify={isOffQueue} />
    </div>
  );
};

export default Dashboard;
