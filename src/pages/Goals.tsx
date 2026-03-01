import Layout from "@/components/Layout";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Target, Lock, Wallet, Gift } from "lucide-react";
import { motion } from "framer-motion";

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Goals = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const goal = profile?.selected_goal || "";
  const targetAmount = profile?.target_amount ?? 0;
  const totalAnnualSpend = profile?.total_annual_spend ?? 0;
  const position = profile?.queue_position ?? 201;
  const pointsBalance = profile?.points_balance ?? 0;

  // Placeholder for claimed total (you might want to fetch this properly)
  const claimedTotal = 0;
  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);

  const isOffQueue = position <= 0;
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 glass-pill px-3 py-1 rounded-full mx-auto">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-medium text-primary">Goal Tracker</span>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">My Goals</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Monitor your progress and claim your utilities spend.
          </p>
        </header>

        <GlassCard variant="glow" className="space-y-6 py-10">
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Active Goal</p>
            <h3 className="font-display font-bold text-4xl text-foreground">
              {goalLabels[goal] || goal || "No Goal Selected"}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-display px-1">
              <span className="text-muted-foreground">Claimable</span>
              <span className="text-primary font-bold">{formatNaira(claimableAmount)}</span>
            </div>

            <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-primary pulse-glow"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
              <span>{formatNaira(claimableAmount)} reached</span>
              <span>Goal: {formatNaira(targetAmount)}</span>
            </div>
          </div>
        </GlassCard>

        <section className="space-y-4">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground px-1">Redeem</h2>
          <GlassButton
            variant="primary"
            onClick={() => navigate("/vouchers")}
            className="w-full py-6 text-lg"
            disabled={!canClaim}
          >
            {!isOffQueue ? (
              <><Lock className="inline w-5 h-5 mr-2" /> Complete Queue to Claim</>
            ) : claimableAmount < 50000 ? (
              <><Lock className="inline w-5 h-5 mr-2" /> Min ₦50,000 to Claim</>
            ) : pointsBalance < 100000 ? (
              <><Lock className="inline w-5 h-5 mr-2" /> Need 100,000 pts to Claim</>
            ) : (
              <><Wallet className="inline w-5 h-5 mr-2" /> Create Voucher Now</>
            )}
          </GlassButton>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <GlassCard className="text-center p-4">
            <Gift className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase font-display tracking-widest">Rewards</p>
            <p className="font-display font-bold text-foreground">Unlocked</p>
          </GlassCard>
          <GlassCard className="text-center p-4">
            <Target className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase font-display tracking-widest">Target</p>
            <p className="font-display font-bold text-foreground">100%</p>
          </GlassCard>
        </section>
      </div>
    </Layout>
  );
};

export default Goals;
