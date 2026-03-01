import GlassCard from "./GlassCard";
import { TrendingUp, Share2, Users } from "lucide-react";

interface QuickStatsProps {
  todaySkipped: number;
  referralCount: number;
  position: number;
}

const QuickStats = ({ todaySkipped, referralCount, position }: QuickStatsProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <GlassCard className="text-center p-4">
        <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="font-display font-bold text-foreground">{todaySkipped}</p>
        <p className="text-[10px] text-muted-foreground">Skipped Today</p>
      </GlassCard>
      <GlassCard className="text-center p-4">
        <Share2 className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="font-display font-bold text-foreground">{referralCount}</p>
        <p className="text-[10px] text-muted-foreground">Referrals</p>
      </GlassCard>
      <GlassCard className="text-center p-4">
        <Users className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="font-display font-bold text-foreground">{position <= 0 ? "✓" : position}</p>
        <p className="text-[10px] text-muted-foreground">Position</p>
      </GlassCard>
    </div>
  );
};

export default QuickStats;
