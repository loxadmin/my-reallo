import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import { Gift, TrendingUp, Target } from "lucide-react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const Goals = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  const totalAnnualSpend = profile.total_annual_spend;
  const targetAmount = profile.target_amount || 0;
  const goal = profile.selected_goal || "Not Selected";
  const claimableAmount = totalAnnualSpend; // Simplified for display, vouchers handle deduction

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 px-1 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Life Goals</h1>
      </div>

      <GlassCard variant="glow" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1">Active Goal</p>
            <p className="font-display text-xl font-bold text-foreground">
              {goalLabels[goal] || goal}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10">
            <Gift className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <p className="text-sm font-medium text-muted-foreground">Progress to Target</p>
            <p className="font-display font-bold text-primary">{formatNaira(claimableAmount)}</p>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(234,179,8,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-display text-muted-foreground uppercase tracking-wider">
            <span>Current</span>
            <span>Target: {formatNaira(targetAmount)}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-foreground">Next Milestone</h3>
          <p className="text-xs text-muted-foreground">Verify your spend to accelerate your goal progress.</p>
        </div>
      </GlassCard>
    </div>
  );
};

export default Goals;
