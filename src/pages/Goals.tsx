import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Lock, Info, Target, TrendingUp, ChevronRight, Award, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";

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

  const totalAnnualSpend = profile?.total_annual_spend ?? 0;
  const targetAmount = profile?.target_amount ?? 0;
  const goal = profile?.selected_goal ?? "";
  const pointsBalance = profile?.points_balance ?? 0;
  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user) return;
      const { data } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchVouchers();
  }, [user]);

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;
  const progressPercent = Math.min((claimableAmount / targetAmount) * 100, 100) || 0;

  return (
    <Layout>
      <section className="px-6 max-w-lg mx-auto space-y-6 pb-24">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold gradient-text">Your Goal</h1>
          <p className="text-sm text-muted-foreground">Track your progress and claim rewards</p>
        </header>

        {/* Goal Progress Card */}
        <GlassCard variant="glow" className="relative overflow-hidden group py-8">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-semibold mb-1">Target Goal</p>
                  <p className="font-display text-xl font-bold text-foreground">{goalLabels[goal] || goal || "Not Set"}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-semibold mb-1">Claimable</p>
                   <p className="font-display text-xl font-bold text-primary">{formatNaira(claimableAmount)}</p>
                </div>
              </div>

              <div className="space-y-3 px-2">
                <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                   <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: `${progressPercent}%` }}
                     transition={{ duration: 1.5, ease: "circOut" }}
                     className="relative h-full rounded-full bg-primary shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                   />
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">{formatNaira(claimableAmount)} earned</span>
                  <span className="text-primary">{formatNaira(targetAmount)} target</span>
                </div>
              </div>

              {claimedTotal > 0 && (
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs px-2">
                   <span className="text-muted-foreground">Previously Claimed</span>
                   <span className="text-foreground font-semibold">{formatNaira(claimedTotal)}</span>
                </div>
              )}
           </div>
        </GlassCard>

        {/* Action Button Container */}
        <div className="space-y-4">
           <GlassButton
             variant="primary"
             onClick={() => navigate("/vouchers")}
             className="w-full py-6 clay-primary text-lg"
             disabled={!canClaim}
           >
             {!isOffQueue ? (
                <><Lock className="inline w-5 h-5 mr-2" /> Complete Queue to Claim</>
              ) : claimableAmount < 50000 ? (
                <><Lock className="inline w-5 h-5 mr-2" /> Min ₦50,000 to Claim</>
              ) : pointsBalance < 100000 ? (
                <><Lock className="inline w-5 h-5 mr-2" /> Need 100,000 pts to Claim</>
              ) : (
                <><Wallet className="inline w-5 h-5 mr-2" /> Create Reward Voucher</>
              )}
           </GlassButton>

           <div className="glass-pill p-4 flex gap-3 items-start">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Requirement</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  To claim your rewards, you must be off the queue, have at least 100,000 points, and a minimum claimable balance of ₦50,000.
                </p>
              </div>
            </div>
        </div>
      </section>
    </Layout>
  );
};

export default Goals;
