import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { Share2, Copy, Check, Wallet, Clock, Users, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DashboardBold = () => {
  const { profile } = useAuth();
  const { formatCurrency } = useCurrency();
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const isOnQueue = (profile.queue_position ?? 0) > 0;
  const pointsNaira = (profile.points_balance ?? 0) * 0.5;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referral_code || "");
    setCopied(true);
    toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    if (navigator.share) {
      navigator.share({ title: "Join Karbali", text: "Claim your spending back!", url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Big Hero Wallet */}
      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 opacity-80" />
          <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Your Wallet</span>
        </div>
        <p className="text-4xl font-black tracking-tight mt-2">{formatCurrency(pointsNaira)}</p>
        <p className="text-sm opacity-70 mt-1">{(profile.points_balance ?? 0).toLocaleString()} points</p>
        
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-primary-foreground/15 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider opacity-60">Annual Spend</p>
            <p className="text-lg font-bold">{formatCurrency(profile.total_annual_spend ?? 0)}</p>
          </div>
          <div className="bg-primary-foreground/15 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider opacity-60">Goal</p>
            <p className="text-lg font-bold capitalize">{profile.selected_goal || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Queue Status - Bold Bar */}
      {isOnQueue ? (
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">Queue Position</span>
            </div>
            <span className="text-3xl font-black text-primary">#{profile.queue_position}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(5, 100 - (profile.queue_position ?? 0) / 10)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">50 people advance daily · Refer friends to skip ahead</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">You're off the queue! 🎉</p>
            <p className="text-xs text-muted-foreground">Head to Verify to start claiming your spend back.</p>
          </div>
        </div>
      )}

      {/* Referral Card - Bold */}
      <div className="rounded-2xl bg-card border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Invite Friends</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {isOnQueue
            ? "Each referral skips you 20 positions in the queue!"
            : "Each referral earns you 1,000 points (₦500)!"}
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-xl p-3">
          <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-widest">{profile.referral_code}</code>
          <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-background transition-colors">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={handleShare} className="p-2 rounded-lg hover:bg-background transition-colors">
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardBold;
