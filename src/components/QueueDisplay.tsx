import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap } from "lucide-react";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
}

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount }: QueueDisplayProps) => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const position = profile?.queue_position ?? 201;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const isOffQueue = position <= 0;

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
      if (!profile) return;
      const [refRes, actRes] = await Promise.all([
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
        supabase.from("waitlist_activity").select("positions_moved").eq("user_id", profile.id).gte("created_at", new Date().toISOString().split("T")[0]),
      ]);
      setReferralCount(refRes.count || 0);
      setTodaySkipped((actRes.data || []).reduce((sum, a) => sum + (a.positions_moved || 0), 0));
    };
    fetchStats();
  }, [profile]);

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

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 px-6">
      {/* Queue Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-4">
        <h2 className="font-display text-lg font-bold text-muted-foreground uppercase tracking-[0.2em]">Queue Status</h2>
        <div className="relative">
           <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full" />
           <motion.h1
             key={position}
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="relative font-display text-8xl font-black gradient-text italic"
           >
             {isOffQueue ? "GO" : position}
           </motion.h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          {isOffQueue
            ? "You've completed the queue! Start claiming your rewards."
            : "Keep going! Share your link to skip positions and reach your goal faster."}
        </p>
      </div>

      {/* Timer Card */}
      {!isOffQueue && (
        <GlassCard variant="strong" className="overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="w-20 h-20" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs font-display font-bold text-primary uppercase tracking-widest">Next batch moving in</p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { val: nextUnlock.hours, label: "Hours" },
                { val: nextUnlock.minutes, label: "Min" },
                { val: nextUnlock.seconds, label: "Sec" },
              ].map((t, i) => (
                <div key={t.label} className="flex flex-col items-center">
                  <p className="font-display text-3xl font-bold text-foreground tabular-nums">
                    {String(t.val).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: "Skipped", val: todaySkipped },
          { icon: Share2, label: "Referrals", val: referralCount },
          { icon: Users, label: "Position", val: isOffQueue ? "✓" : position },
        ].map((stat, i) => (
          <GlassCard key={i} className="flex flex-col items-center p-4 space-y-1" animate={false}>
            <stat.icon className="w-4 h-4 text-primary opacity-60" />
            <p className="font-display font-bold text-lg">{stat.val}</p>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Referral Link Card */}
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Skip the Queue</h3>
            <p className="text-xs text-muted-foreground">Get 5 positions for every friend.</p>
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex items-center gap-2">
              <div className="flex-1 glass-input rounded-2xl px-4 py-3 text-xs text-muted-foreground truncate font-mono">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className="p-3 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
           </div>
           <GlassButton
             variant="primary"
             className="w-full py-4 text-sm font-bold shadow-xl shadow-primary/10"
             onClick={handleShare}
           >
             Share Invite Link
           </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};

export default QueueDisplay;
