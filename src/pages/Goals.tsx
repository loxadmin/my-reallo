import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Target, Lock, Wallet, ArrowRight } from "lucide-react";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const Goals = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [claimedTotal, setClaimedTotal] = useState(0);

  useEffect(() => {
    const fetchClaimed = async () => {
      if (!user) return;
      const { data } = await supabase.from("vouchers").select("amount_naira").eq("user_id", user.id);
      setClaimedTotal((data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchClaimed();
  }, [user]);

  if (loading || !profile) return null;

  const goal = profile.selected_goal || "";
  const targetAmount = profile.target_amount || 0;
  const totalAnnualSpend = profile.total_annual_spend || 0;
  const pointsBalance = profile.points_balance || 0;
  const position = profile.queue_position ?? 999;
  const isOffQueue = position <= 0;

  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <Navbar />

      <section className="min-h-screen flex items-start justify-center px-4 pt-24 pb-32">
        <div className="w-full max-w-md space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-bold">Your Goal</h1>
              <p className="text-sm text-muted-foreground">Track your progress toward financial freedom</p>
            </div>

            <GlassCard variant="glow" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-[0.2em]">Active Goal</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-display text-xl font-bold text-foreground">{goalLabels[goal] || goal || "No goal set"}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-[0.2em]">Claimable</p>
                  <p className="font-display text-xl font-bold text-primary">{formatNaira(claimableAmount)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{formatNaira(claimableAmount)} reached</span>
                  <span className="text-foreground">{formatNaira(targetAmount)} target</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest mb-1">Already Claimed</p>
                  <p className="text-sm font-semibold">{formatNaira(claimedTotal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest mb-1">Total Potential</p>
                  <p className="text-sm font-semibold">{formatNaira(totalAnnualSpend)}</p>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassButton
                variant="primary"
                onClick={() => navigate("/vouchers")}
                className="w-full py-4 text-base"
                disabled={!canClaim}
              >
                {!isOffQueue ? (
                  <><Lock className="w-4 h-4 mr-2" /> Complete Queue to Claim</>
                ) : claimableAmount < 50000 ? (
                  <><Lock className="w-4 h-4 mr-2" /> Min ₦50,000 to Claim</>
                ) : pointsBalance < 100000 ? (
                  <><Lock className="w-4 h-4 mr-2" /> Need 100,000 pts to Claim</>
                ) : (
                  <><Wallet className="w-4 h-4 mr-2" /> Claim & Create Voucher</>
                )}
              </GlassButton>

              <GlassButton
                variant="outline"
                onClick={() => navigate("/goal-selection")}
                className="w-full py-4"
              >
                Change Goal <ArrowRight className="w-4 h-4 ml-2" />
              </GlassButton>
            </div>
          </motion.div>
        </div>
      </section>

      <BottomNav active="goal" onChange={() => {}} showVerify={(profile?.queue_position ?? 1) <= 0} />
    </div>
  );
};

export default Goals;
