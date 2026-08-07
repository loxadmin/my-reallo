import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { Copy, Check, Share2, Wallet, Zap, Users, ArrowUpRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TaskProgressStrip from "@/components/tasks/TaskProgressStrip";
import GoalAccountStrip from "@/components/GoalAccountStrip";

const DashboardNeon = () => {
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
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Neon Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-primary/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet</p>
                <p className="text-[11px] text-muted-foreground">{(profile.points_balance ?? 0).toLocaleString()} pts</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-primary/40" />
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatCurrency(pointsNaira)}</p>
          <div className="mt-5 flex gap-3">
            <div className="flex-1 rounded-xl bg-muted/50 p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Annual Spend</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(profile.total_annual_spend ?? 0)}</p>
            </div>
            <div className="flex-1 rounded-xl bg-muted/50 p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Goal</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{profile.selected_goal || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue - Neon accent */}
      {isOnQueue ? (
        <div className="rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <span className="text-lg font-black text-primary">#{profile.queue_position}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">In Queue</p>
                <p className="text-[11px] text-muted-foreground">50 advance daily</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Est. days</p>
              <p className="text-lg font-bold text-primary">{Math.ceil((profile.queue_position ?? 0) / 50)}</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(5, 100 - (profile.queue_position ?? 0) / 10)}%` }} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Off the Queue! 🎉</p>
            <p className="text-[11px] text-muted-foreground">Start verifying your spend to claim rewards.</p>
          </div>
        </div>
      )}

      <GoalAccountStrip />
      <TaskProgressStrip />

      {/* Referral */}
      <div className="rounded-2xl bg-card border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Refer & Earn</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isOnQueue ? "Skip 20 positions per referral" : "Earn ₦500 per friend"}
        </p>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5">
          <code className="flex-1 text-[13px] font-mono font-bold text-foreground tracking-[0.15em]">{profile.referral_code}</code>
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

export default DashboardNeon;
