import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Lock, Wallet } from "lucide-react";

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

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data: voucherRes } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((voucherRes || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchStats();
  }, [user]);

  const goal = profile?.selected_goal || "";
  const targetAmount = profile?.target_amount || 0;
  const totalAnnualSpend = profile?.total_annual_spend || 0;
  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  const pointsBalance = profile?.points_balance ?? 0;
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Goal</h1>
        </header>

        <div className="space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-display">Your Goal</p>
                <p className="font-display font-semibold text-foreground">{goalLabels[goal] || goal}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-display">Claimable</p>
                <p className="font-display font-semibold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
            </div>
            <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
            {claimedTotal > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">Already claimed: {formatNaira(claimedTotal)}</p>
            )}
          </GlassCard>

          <GlassButton
            variant="primary"
            onClick={() => navigate("/vouchers")}
            className="w-full"
            disabled={!canClaim}
          >
            {!isOffQueue ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Complete Queue to Claim</>
            ) : claimableAmount < 50000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Min ₦50,000 to Claim</>
            ) : pointsBalance < 100000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Need 100,000 pts to Claim</>
            ) : (
              <><Wallet className="inline w-4 h-4 mr-2" /> Claim Amount — Create Voucher</>
            )}
          </GlassButton>
        </div>
      </div>
    </Layout>
  );
};

export default Goals;
