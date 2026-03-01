import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Gift, Lock, Wallet } from "lucide-react";

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

  const goal = profile?.selected_goal || "";
  const targetAmount = profile?.target_amount || 0;
  const totalAnnualSpend = profile?.total_annual_spend || 0;
  const pointsBalance = profile?.points_balance || 0;
  const isOffQueue = (profile?.queue_position ?? 201) <= 0;

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("vouchers")
        .select("amount_naira")
        .eq("user_id", user.id);

      const total = (data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0);
      setClaimedTotal(total);
    };
    fetchVouchers();
  }, [user]);

  return (
    <div className="container max-w-md mx-auto py-20 px-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">My Goals</h1>

      <GlassCard variant="strong">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-display">Your Goal</p>
            <p className="font-display font-semibold text-foreground text-lg">{goalLabels[goal] || goal}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-display">Claimable</p>
            <p className="font-display font-semibold text-primary text-lg">{formatNaira(claimableAmount)}</p>
          </div>
        </div>

        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-muted-foreground">{formatNaira(claimableAmount)}</p>
          <p className="text-xs text-muted-foreground">{formatNaira(targetAmount)}</p>
        </div>

        {claimedTotal > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Already claimed: {formatNaira(claimedTotal)}
          </p>
        )}
      </GlassCard>

      <GlassButton
        variant="primary"
        onClick={() => navigate("/vouchers")}
        className="w-full py-6"
        disabled={!canClaim}
      >
        {!isOffQueue ? (
          <><Lock className="inline w-5 h-5 mr-2" /> Complete Queue to Claim</>
        ) : claimableAmount < 50000 ? (
          <><Lock className="inline w-5 h-5 mr-2" /> Min ₦50,000 to Claim</>
        ) : pointsBalance < 100000 ? (
          <><Lock className="inline w-5 h-5 mr-2" /> Need 100,000 pts to Claim</>
        ) : (
          <><Wallet className="inline w-5 h-5 mr-2" /> Claim Amount — Create Voucher</>
        )}
      </GlassButton>

      <div className="flex items-center justify-center gap-2 p-4 glass-card rounded-2xl">
        <Gift className="w-5 h-5 text-primary" />
        <p className="text-sm text-muted-foreground">Keep earning points to reach your goal faster!</p>
      </div>
    </div>
  );
};

export default Goals;
