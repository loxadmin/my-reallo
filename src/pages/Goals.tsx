import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Lock, Wallet, Target, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const Goals = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [claimedTotal, setClaimedTotal] = useState(0);

  const goal = profile?.selected_goal || "Not set";
  const targetAmount = profile?.target_amount || 0;
  const totalAnnualSpend = profile?.total_annual_spend || 0;
  const pointsBalance = profile?.points_balance ?? 0;
  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;

  useEffect(() => {
    const fetchClaimed = async () => {
      if (!user) return;
      const { data } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchClaimed();
  }, [user]);

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;
  const progress = targetAmount > 0 ? (claimableAmount / targetAmount) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-display tracking-tight">Goal</h1>
          <p className="text-muted-foreground text-sm font-medium">Reclaim your utility spend.</p>
        </div>

        {/* Goal Preview Card */}
        <GlassCard variant="glow" className="overflow-hidden border-emerald-500/20 bg-emerald-500/5 px-0 pt-0">
           <div className="bg-emerald-500/10 p-8 flex flex-col items-center text-center relative">
             <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
               Active
             </div>
             <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-4">
               <Target className="w-8 h-8 text-emerald-500" />
             </div>
             <h2 className="font-display font-bold text-2xl text-emerald-600 dark:text-emerald-400">
               {goalLabels[goal] || goal}
             </h2>
             <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-1">Target Achievement</p>
           </div>

           <div className="p-8 space-y-8">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Progress</span>
                <span className="text-4xl font-bold font-display tracking-tight">{Math.round(progress)}%</span>
              </div>

              <div className="space-y-3">
                <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between font-bold font-display uppercase tracking-tighter">
                  <div className="text-left">
                     <p className="text-[10px] text-muted-foreground">Current</p>
                     <p className="text-emerald-500 text-lg leading-tight">{formatNaira(claimableAmount)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] text-muted-foreground">Goal</p>
                     <p className="text-foreground text-lg leading-tight">{formatNaira(targetAmount)}</p>
                  </div>
                </div>
              </div>

              {claimedTotal > 0 && (
                <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Already Claimed</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatNaira(claimedTotal)}</span>
                </div>
              )}
           </div>
        </GlassCard>

        {/* Action Button */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg px-1">Actions</h2>
          <GlassButton
            variant="primary"
            onClick={() => navigate("/vouchers")}
            className="w-full py-6 text-lg rounded-2xl group flex justify-between px-8"
            disabled={!canClaim}
          >
            <div className="flex items-center gap-3">
              {!isOffQueue ? (
                <><Lock className="w-6 h-6" /><span className="font-bold">Complete Queue to Claim</span></>
              ) : claimableAmount < 50000 ? (
                <><Lock className="w-6 h-6" /><span className="font-bold">Min ₦50,000 to Claim</span></>
              ) : pointsBalance < 100000 ? (
                <><Lock className="w-6 h-6" /><span className="font-bold">Need 100,000 pts to Claim</span></>
              ) : (
                <><Wallet className="w-6 h-6" /><span className="font-bold">Claim Amount — Create Voucher</span></>
              )}
            </div>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </GlassButton>
        </div>

        {/* Eligibility Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-3xl border ${isOffQueue ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted/20'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queue Position</p>
            <p className={`text-xl font-bold font-display mt-1 ${isOffQueue ? 'text-emerald-500' : 'text-foreground'}`}>
              {isOffQueue ? 'Finished' : position}
            </p>
          </div>
          <div className={`p-4 rounded-3xl border ${pointsBalance >= 100000 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted/20'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Points Threshold</p>
            <p className={`text-xl font-bold font-display mt-1 ${pointsBalance >= 100000 ? 'text-emerald-500' : 'text-foreground'}`}>
              {pointsBalance.toLocaleString()}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground font-medium leading-relaxed max-w-[280px] mx-auto opacity-70">
           Note: To claim funds, you must be off the queue, have at least 100,000 points, and a claimable amount above ₦50,000.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Goals;
