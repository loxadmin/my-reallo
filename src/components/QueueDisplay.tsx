import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import DecisionFlow from "./DecisionFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "./BottomNav";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  view: DashView;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount, view }: QueueDisplayProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [verifyLink, setVerifyLink] = useState("");
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [claimedTotal, setClaimedTotal] = useState(0);

  const position = profile?.queue_position ?? 201;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const isNext = position <= 1;
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

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  return (
    <section className="min-h-screen flex items-start justify-center px-4 pt-20 pb-28 lg:pt-8 lg:pb-8">
      <div className="w-full max-w-md lg:max-w-2xl space-y-4">
        {/* ═══ HOME VIEW ═══ */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Wallet hero card */}
            <GlassCard variant="glow" className="text-center">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                {isNext || isOffQueue ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3 pulse-glow">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="font-display text-xl font-bold gradient-text mb-1">
                      {isOffQueue ? "You're Off the Queue!" : "You're Next!"}
                    </h2>
                    <p className="text-[12px] text-muted-foreground">
                      {isOffQueue ? "Earn points, verify spend & claim your money." : "Activate your reclaim now."}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium mb-1">People ahead of you</p>
                    <motion.h2 key={position} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-4xl font-bold gradient-text">
                      {position}
                    </motion.h2>
                    <p className="text-[12px] text-muted-foreground mt-2">Skip the queue — refer a friend and move up 5 spots.</p>
                  </>
                )}
              </motion.div>
            </GlassCard>

            {/* Goal + Points side by side */}
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="p-4" animate={false}>
                <Target className="w-4 h-4 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Goal</p>
                <p className="text-[13px] font-semibold text-foreground truncate">{goalLabels[goal] || goal}</p>
                <p className="text-[12px] text-primary font-semibold mt-0.5">{formatNaira(claimableAmount)}</p>
              </GlassCard>
              <GlassCard className="p-4" animate={false}>
                <Award className="w-4 h-4 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</p>
                <p className="text-[13px] font-semibold text-foreground">{pointsBalance.toLocaleString()}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">= {formatNaira(Math.floor(pointsBalance * 0.5))}</p>
              </GlassCard>
            </div>

            {/* Timer */}
            {!isOffQueue && (
              <GlassCard variant="strong" className="text-center p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Next Queue Unlock</p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  {[
                    { val: nextUnlock.hours, label: "Hours" },
                    { val: nextUnlock.minutes, label: "Min" },
                    { val: nextUnlock.seconds, label: "Sec" },
                  ].map((t, i) => (
                    <div key={t.label} className="flex items-center gap-4">
                      {i > 0 && <span className="text-lg text-primary/40 font-bold">:</span>}
                      <div className="text-center min-w-[36px]">
                        <p className="font-display text-xl font-bold text-foreground tabular-nums">{String(t.val).padStart(2, "0")}</p>
                        <p className="text-[9px] text-muted-foreground">{t.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary" /> 10 users unlock & move up every day
                </p>
              </GlassCard>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <GlassCard className="text-center p-3" animate={false}>
                <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-[13px]">{todaySkipped}</p>
                <p className="text-[9px] text-muted-foreground">Skipped Today</p>
              </GlassCard>
              <GlassCard className="text-center p-3" animate={false}>
                <Share2 className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-[13px]">{referralCount}</p>
                <p className="text-[9px] text-muted-foreground">Referrals</p>
              </GlassCard>
              <GlassCard className="text-center p-3" animate={false}>
                <Users className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-[13px]">{position <= 0 ? "✓" : position}</p>
                <p className="text-[9px] text-muted-foreground">Position</p>
              </GlassCard>
            </div>

            {/* Referral card */}
            <GlassCard variant="strong">
              <h3 className="font-display font-semibold text-foreground text-[13px] mb-2">
                {isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}
              </h3>
              <p className="text-[12px] text-muted-foreground mb-3">
                {isOffQueue ? "Each referral earns you 1,000 points (₦500). Share your link!" : "For every friend you refer, skip 5 positions."}
              </p>
              {profile?.referral_code && (
                <>
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Your referral code</p>
                  <p className="font-semibold text-primary text-[13px] mb-3">{profile.referral_code}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 glass-input rounded-xl px-3 py-2.5 text-[11px] text-muted-foreground truncate">{referralLink}</div>
                    <GlassButton variant="outline" onClick={handleCopy} className="px-3">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </GlassButton>
                  </div>
                  <GlassButton variant="primary" className="w-full mt-3 text-[13px]" onClick={handleShare}>
                    <Share2 className="inline w-4 h-4 mr-2" /> {isOffQueue ? "Share & Earn" : "Share Referral Link"}
                  </GlassButton>
                </>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* ═══ EARN VIEW ═══ */}
        {view === "earn" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Points Balance</p>
              </div>
              <p className="font-display text-2xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
            </GlassCard>
            <DecisionFlow />
          </motion.div>
        )}

        {/* ═══ GOAL VIEW ═══ */}
        {view === "goal" && (
          <motion.div key="goal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your Goal</p>
                  <p className="font-semibold text-foreground text-[13px]">{goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Claimable</p>
                  <p className="font-semibold text-primary text-[13px]">{formatNaira(claimableAmount)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
              {claimedTotal > 0 && <p className="text-[10px] text-muted-foreground mt-1">Already claimed: {formatNaira(claimedTotal)}</p>}
            </GlassCard>

            <GlassButton variant="primary" onClick={() => navigate("/vouchers")} className="w-full text-[13px]" disabled={!canClaim}>
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
          </motion.div>
        )}

        {/* ═══ VERIFY VIEW ═══ */}
        {view === "verify" && isOffQueue && (
          <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <VerifySpendFlow />
            {verifyLink && (
              <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                <GlassButton variant="outline" className="w-full text-[13px]">
                  <ExternalLink className="inline w-4 h-4 mr-2" /> Verify Expense
                </GlassButton>
              </a>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default QueueDisplay;
