import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Wallet, Lock, TrendingUp, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const Goals = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [claimedTotal, setClaimedTotal] = useState(0);

  const goal = profile?.selected_goal || "";
  const targetAmount = profile?.target_amount || 0;
  const totalAnnualSpend = profile?.total_annual_spend || 0;
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  const pointsBalance = profile?.points_balance ?? 0;

  useEffect(() => {
    const fetchVoucherTotal = async () => {
      if (!user) return;
      const { data } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchVoucherTotal();
  }, [user]);

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  return (
    <div className="relative min-h-screen pb-24">
      <Navbar />
      <div className="pt-24 px-6 max-w-lg mx-auto space-y-6">
        <GlassCard variant="glow" className="text-center overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Gift className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-display mb-1">
              Active Goal
            </p>
            <h2 className="font-display text-4xl font-bold gradient-text">
              {goalLabels[goal] || goal || "No Goal Set"}
            </h2>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-display">Target Reclaim</p>
              <p className="font-display font-bold text-lg">{formatNaira(targetAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-display">Claimable Balance</p>
              <p className="font-display font-bold text-lg text-primary">{formatNaira(claimableAmount)}</p>
            </div>
          </div>

          <div className="relative h-4 w-full bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_20px_hsla(var(--primary)/0.5)]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{Math.round((claimableAmount / targetAmount) * 100)}% Complete</span>
            </div>
            {claimedTotal > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>{formatNaira(claimedTotal)} Claimed</span>
              </div>
            )}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 gap-4">
          <GlassButton
            variant="primary"
            onClick={() => navigate("/vouchers")}
            className="w-full py-6 text-base"
            disabled={!canClaim}
          >
            {!isOffQueue ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Complete Queue to Claim</>
            ) : claimableAmount < 50000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Min ₦50,000 to Claim</>
            ) : pointsBalance < 100000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Need 100,000 pts to Claim</>
            ) : (
              <><Wallet className="inline w-4 h-4 mr-2" /> Claim to Voucher Now</>
            )}
          </GlassButton>
        </div>

        {!isOffQueue && (
          <GlassCard className="bg-primary/5 border-primary/20 text-center p-6">
            <div className="flex flex-col items-center gap-3">
              <Lock className="w-8 h-8 text-primary/60" />
              <div>
                <h4 className="font-display font-bold text-foreground">Goal Access Locked</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You must be off the queue to start claiming your funds. Refer friends to skip faster.
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default Goals;
