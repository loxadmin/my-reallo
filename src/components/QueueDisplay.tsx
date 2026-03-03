import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "./BottomNav";
import WalletHero from "./WalletHero";
import GoalSection from "./GoalSection";
import SwitchTabSection from "./SwitchTabSection";
import ServicesGrid from "./ServicesGrid";
import ReferralSection from "./ReferralSection";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  view: DashView;
  onChangeView: (view: DashView) => void;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount, view, onChangeView }: QueueDisplayProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [verifyLink, setVerifyLink] = useState("");
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [claimedTotal, setClaimedTotal] = useState(0);

  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;
  const pointsBalance = profile?.points_balance ?? 0;
  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);
  const canClaim = isOffQueue && pointsBalance >= 100000 && claimableAmount >= 50000;

  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      setNextUnlock({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calcTimeLeft();
    const interval = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile || !user) return;
      const [refRes, actRes, settingsRes, voucherRes] = await Promise.all([
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
        supabase.from("waitlist_activity").select("positions_moved").eq("user_id", profile.id).gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single(),
        supabase.from("vouchers").select("amount_naira").eq("user_id", user.id),
      ]);
      setReferralCount(refRes.count || 0);
      setTodaySkipped((actRes.data || []).reduce((sum, a) => sum + (a.positions_moved || 0), 0));
      setVerifyLink(settingsRes.data?.value || "");
      setClaimedTotal((voucherRes.data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
    };
    fetchStats();
  }, [profile, user]);

  return (
    <div className="w-full flex flex-col items-center gap-24 px-6 pb-40 pt-12 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {view === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center gap-24"
          >
            {/* Wallet Hero */}
            <WalletHero
              position={position}
              totalAnnualSpend={totalAnnualSpend}
              isOffQueue={isOffQueue}
            />

            {/* Goal Section */}
            <GoalSection
              goal={goal}
              claimableAmount={claimableAmount}
              targetAmount={targetAmount}
            />

            {/* Switch Tab Section */}
            <SwitchTabSection
              active={view}
              onChange={onChangeView}
              showVerify={isOffQueue}
            />

            {/* Services Grid */}
            <ServicesGrid />

            {/* Referral Section */}
            <ReferralSection
              referralCode={profile?.referral_code || ""}
              isOffQueue={isOffQueue}
            />
          </motion.div>
        ) : (
          <motion.div
            key="other-views"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl"
          >
            <div className="mb-24 flex flex-col items-center">
               <SwitchTabSection active={view} onChange={onChangeView} showVerify={isOffQueue} />
            </div>

            {view === "earn" && (
              <div className="space-y-12">
                <GlassCard variant="strong" className="text-center py-20 rounded-[48px]">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <Award className="w-8 h-8 text-primary" />
                    <span className="text-[12px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-60">Points Balance Index</span>
                  </div>
                  <p className="text-7xl font-black text-foreground tracking-tighter mb-4">{pointsBalance.toLocaleString()}</p>
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-primary">≈ {formatNaira(Math.floor(pointsBalance * 0.5))} Market Value</p>
                </GlassCard>
                <QuestionnaireFlow />
              </div>
            )}

            {view === "goal" && (
              <div className="space-y-12">
                <GoalSection goal={goal} claimableAmount={claimableAmount} targetAmount={targetAmount} />
                <GlassCard className="p-12 rounded-[48px] border-primary/20 bg-white/5 dark:bg-black/20">
                   <h4 className="text-2xl font-black mb-8 tracking-tight text-foreground uppercase tracking-[0.4em]">Claim Settlement Module</h4>
                   <p className="text-muted-foreground mb-12 uppercase tracking-[0.3em] font-black text-[12px] leading-relaxed opacity-60">
                      Access your enterprise vouchers once the minimum threshold of 100,000 points and ₦50,000 claimable amount has been achieved.
                   </p>
                   <GlassButton variant="primary" onClick={() => navigate("/vouchers")} className="w-full h-24 rounded-[36px] text-[13px] font-black tracking-[0.4em]" disabled={!canClaim}>
                      {!isOffQueue ? (
                        <><Lock className="w-6 h-6 mr-4" /> Queue Access Restricted</>
                      ) : claimableAmount < 50000 ? (
                        <><Lock className="w-6 h-6 mr-4" /> Min ₦50,000 Required</>
                      ) : pointsBalance < 100000 ? (
                        <><Lock className="w-6 h-6 mr-4" /> 100,000 Pts Required</>
                      ) : (
                        <><Wallet className="w-6 h-6 mr-4" /> Execute Claim Settlement</>
                      )}
                    </GlassButton>
                </GlassCard>
              </div>
            )}

            {view === "verify" && isOffQueue && (
              <div className="space-y-12">
                <VerifySpendFlow />
                {verifyLink && (
                  <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block">
                    <GlassButton variant="outline" className="w-full h-24 rounded-[36px] text-[13px] font-black tracking-[0.4em]">
                      <ExternalLink className="w-6 h-6 mr-4" /> External Audit Sector
                    </GlassButton>
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QueueDisplay;
