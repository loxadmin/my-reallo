import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { Copy, Check, Share2, CreditCard, Clock, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TaskProgressStrip from "@/components/tasks/TaskProgressStrip";
import GoalFundingPanel from "@/components/GoalFundingPanel";

const DashboardCards = () => {
  const { profile } = useAuth();
  const { formatCurrency } = useCurrency();
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const isOnQueue = (profile.queue_position ?? 0) > 0;
  const pointsNaira = (profile.points_balance ?? 0) * 0.5;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referral_code || "");
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    if (navigator.share) {
      navigator.share({ title: "Join Karbali", url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      {/* Card grid layout */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Balance Card */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-r from-foreground to-foreground/80 p-5 text-background">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 opacity-60" />
            <span className="text-[10px] uppercase tracking-widest opacity-60 font-medium">Balance</span>
          </div>
          <p className="text-3xl font-bold mt-1">{formatCurrency(pointsNaira)}</p>
          <p className="text-[11px] opacity-50 mt-0.5">{(profile.points_balance ?? 0).toLocaleString()} points</p>
        </div>

        {/* Spend Card */}
        <div className="rounded-2xl bg-card border border-border/50 p-4">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Annual Spend</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(profile.total_annual_spend ?? 0)}</p>
        </div>

        {/* Goal Card */}
        <div className="rounded-2xl bg-card border border-border/50 p-4">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Goal</p>
          <p className="text-lg font-bold text-foreground mt-1 capitalize">{profile.selected_goal || "Not set"}</p>
        </div>
      </div>

      {/* Queue Status */}
      {isOnQueue ? (
        <div className="rounded-2xl bg-card border border-border/50 p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Position #{profile.queue_position}</p>
              <p className="text-[11px] text-muted-foreground">~{Math.ceil((profile.queue_position ?? 0) / 50)} days remaining</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-foreground h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(5, 100 - (profile.queue_position ?? 0) / 10)}%` }} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">You're off the queue! 🎉</p>
            <p className="text-[11px] text-muted-foreground">Verify your spend to claim rewards.</p>
          </div>
        </div>
      )}

      <GoalFundingPanel />
      <TaskProgressStrip />

      {/* Referral */}
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Invite & Earn</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isOnQueue ? "Each referral skips 20 queue positions" : "Earn ₦500 per friend who joins"}
        </p>
        <div className="flex items-center bg-muted/50 rounded-xl p-3 gap-2">
          <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-widest">{profile.referral_code}</code>
          <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-background transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button onClick={handleShare} className="p-2 rounded-lg hover:bg-background transition-colors">
            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardCards;
