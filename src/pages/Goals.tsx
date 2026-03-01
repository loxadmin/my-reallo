import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const GoalsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [claimedTotal, setClaimedTotal] = useState(0);

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

  if (!profile) return null;

  const totalAnnualSpend = profile.total_annual_spend;
  const goal = profile.selected_goal || "";
  const targetAmount = profile.target_amount;
  const position = profile.queue_position ?? 201;
  const isOffQueue = position <= 0;
  const pointsBalance = profile.points_balance ?? 0;

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-4">
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
            <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
                {claimedTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Already Claimed: {formatNaira(claimedTotal)}</p>
                )}
            </div>
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
    </div>
  );
};

export default GoalsPage;
