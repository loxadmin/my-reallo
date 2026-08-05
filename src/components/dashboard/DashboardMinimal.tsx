import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MinimalAutoSlider from "./MinimalAutoSlider";
import TaskProgressStrip from "@/components/tasks/TaskProgressStrip";

const DashboardMinimal = () => {
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
    <div className="p-5 lg:p-8 max-w-lg mx-auto space-y-8">
      {/* Balance - Ultra minimal */}
      <div className="text-center pt-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Balance</p>
        <p className="text-5xl font-extralight text-foreground mt-2 tracking-tight">{formatCurrency(pointsNaira)}</p>
        <p className="text-xs text-muted-foreground mt-1">{(profile.points_balance ?? 0).toLocaleString()} pts</p>
      </div>

      <MinimalAutoSlider />

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Stats row */}
      <div className="grid grid-cols-3 text-center gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Spend</p>
          <p className="text-sm font-medium text-foreground mt-1">{formatCurrency(profile.total_annual_spend ?? 0)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Queue</p>
          <p className="text-sm font-medium text-foreground mt-1">
            {isOnQueue ? `#${profile.queue_position}` : "Done ✓"}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Goal</p>
          <p className="text-sm font-medium text-foreground mt-1 capitalize">{profile.selected_goal || "—"}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      <TaskProgressStrip />

      {/* Referral - Clean */}
      <div className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Referral Code</p>
        <p className="text-2xl font-light tracking-[0.3em] text-foreground">{profile.referral_code}</p>
        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
          {isOnQueue ? "Skip 20 queue positions per referral" : "Earn ₦500 per friend who joins"}
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border/40 hover:border-border"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border/40 hover:border-border"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMinimal;
