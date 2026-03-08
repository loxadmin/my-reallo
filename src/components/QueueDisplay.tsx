import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import DecisionFlow from "./DecisionFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import InfluencerPanel from "./InfluencerPanel";
import NotificationsPanel from "./NotificationsPanel";
import WalletCarousel from "./WalletCarousel";
import { Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, AlertCircle, CheckCircle2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "@/pages/Dashboard";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  view: DashView;
  onViewChange?: (view: DashView) => void;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount, view, onViewChange }: QueueDisplayProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [referredUsers, setReferredUsers] = useState<{ email: string; created_at: string }[]>([]);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [verifyLink, setVerifyLink] = useState("");
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [claimedTotal, setClaimedTotal] = useState(0);
  const [spendVerified, setSpendVerified] = useState(false);
  const [isVerifyActive, setIsVerifyActive] = useState(true);

  const position = profile?.queue_position ?? 201;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const isOffQueue = position <= 0;
  const pointsBalance = profile?.points_balance ?? 0;
  const nairaValue = Math.floor(pointsBalance * 0.5);
  const claimableAmount = Math.max(0, totalAnnualSpend - claimedTotal);

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
      const [refRes, actRes, settingsRes, voucherRes, verifyRes, activeRes, refUsersRes] = await Promise.all([
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
        supabase.from("waitlist_activity").select("positions_moved").eq("user_id", profile.id).gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single(),
        supabase.from("vouchers").select("amount_naira").eq("user_id", user.id),
        supabase.from("spend_verifications").select("status, spend_type").eq("user_id", user.id),
        supabase.from("admin_settings").select("value").eq("key", "verify_page_active").single(),
        supabase.from("referrals").select("referred_user_id, created_at, profiles!referrals_referred_user_id_fkey(email)").eq("referrer_id", profile.id).order("created_at", { ascending: false }),
      ]);
      setReferralCount(refRes.count || 0);
      setReferredUsers(
        (refUsersRes.data || []).map((r: any) => ({
          email: (r.profiles as any)?.email || "Unknown",
          created_at: r.created_at,
        }))
      );
      setTodaySkipped((actRes.data || []).reduce((sum, a) => sum + (a.positions_moved || 0), 0));
      setVerifyLink(settingsRes.data?.value || "");
      setIsVerifyActive(activeRes.data?.value === "false" ? false : true);
      setClaimedTotal((voucherRes.data || []).reduce((sum, v) => sum + Number(v.amount_naira || 0), 0));
      const verifs = (verifyRes.data || []) as { status: string; spend_type: string }[];
      const dataV = verifs.find(v => (v as any).spend_type === "data");
      const elecV = verifs.find(v => (v as any).spend_type === "electricity");
      const dataOk = dataV?.status === "verified" || dataV?.status === "completed";
      const elecOk = elecV?.status === "verified" || elecV?.status === "completed";
      setSpendVerified(dataOk && elecOk);
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

  // 4-step claim check
  const handleClaimClick = () => {
    // Check 1: Has points?
    if (pointsBalance <= 0) {
      toast({ title: "No Points", description: "You need to earn points before you can claim. Go to the Earn page." });
      return;
    }
    // Check 2: Spend verified?
    if (!spendVerified) {
      toast({ title: "Verify Your Spend", description: "You need to verify your spend before claiming. Go to the Verify page." });
      return;
    }
    // Check 3: Min 50k naira (100k points)?
    if (nairaValue < 50000) {
      toast({ title: "Not Enough Points", description: `You need at least 100,000 points (₦50,000). You have ${pointsBalance.toLocaleString()} points (₦${nairaValue.toLocaleString()}). Earn more points!` });
      return;
    }
    // Check 4: Off queue for 6 months?
    const offQueueAt = (profile as any)?.off_queue_at;
    if (offQueueAt) {
      const offDate = new Date(offQueueAt);
      const sixMonthsLater = new Date(offDate);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (new Date() < sixMonthsLater) {
        const monthsLeft = Math.ceil((sixMonthsLater.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30));
        toast({ title: "Goal Not Matured", description: `Your goal savings has not reached maturity. ${monthsLeft} month(s) remaining of the 6-month maturity period.` });
        return;
      }
    } else if (isOffQueue) {
      // Off queue but no off_queue_at recorded - set it now
      supabase.from("profiles").update({ off_queue_at: new Date().toISOString() }).eq("id", user!.id);
      toast({ title: "Goal Not Matured", description: "Your goal savings is less than 6 months and has not reached maturity." });
      return;
    }
    // All checks passed
    navigate("/vouchers");
  };

  return (
    <section className="min-h-screen flex items-start justify-center px-4 pt-4 pb-12 lg:pt-8 lg:pb-8">
      <div className="w-full max-w-md lg:max-w-2xl space-y-4">
        {/* ═══ HOME VIEW ═══ */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Unified Wallet + Goal Card */}
            <GlassCard className="p-4">
              {/* Welcome */}
              <p className="text-foreground text-[13px] font-medium mb-3">
                Welcome back, {user?.email?.split("@")[0] || "User"} 👋
              </p>

              {/* Swipeable Wallet Cards */}
              <WalletCarousel pointsBalance={pointsBalance} nairaValue={nairaValue} />

              {/* Goal Progress */}
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between items-end">
                  <p className="font-medium text-foreground text-[12px]">GOAL - {goalLabels[goal] || goal}</p>
                  <p className="text-muted-foreground text-[11px]">{Math.round((nairaValue / targetAmount) * 100)}%</p>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((nairaValue / targetAmount) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Claimable: <span className="text-primary font-semibold">{formatNaira(nairaValue)}</span> ({pointsBalance.toLocaleString()} pts)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <GlassButton
                  variant="primary"
                  onClick={isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." })}
                  className="flex-1 h-10 rounded-xl text-[12px]"
                  disabled={!isOffQueue}
                >
                  {isOffQueue ? <><Wallet className="w-3.5 h-3.5" /> Claim</> : <><Lock className="w-3.5 h-3.5" /> Claim</>}
                </GlassButton>
                <GlassButton
                  variant="outline"
                  onClick={() => onViewChange?.("earn")}
                  className="flex-1 h-10 rounded-xl text-[12px]"
                >
                  <Award className="w-3.5 h-3.5" /> Earn
                </GlassButton>
              </div>
            </GlassCard>

            {/* Queue & Stats - Interactive */}
            {!isOffQueue && (
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold text-foreground">Queue Progress</p>
                  <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                    <Zap className="w-3 h-3" />
                    Position #{position}
                  </div>
                </div>
                <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, 100 - (position / 5)))}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-foreground">{todaySkipped}</p>
                    <p className="text-[9px] text-muted-foreground">Skipped Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-primary">{`${nextUnlock.hours}h ${nextUnlock.minutes}m`}</p>
                    <p className="text-[9px] text-muted-foreground">Next Advance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-bold text-foreground">50/day</p>
                    <p className="text-[9px] text-muted-foreground">Auto Skip</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Refer friends to skip 20 positions each
                </p>
              </GlassCard>
            )}

            {isOffQueue && (
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-[12px] font-semibold text-foreground">You're off the queue!</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Earn points and verify your spend to claim your goal.</p>
              </GlassCard>
            )}

            {/* Services Grid */}
            <div className="space-y-3">
              <p className="text-foreground font-semibold text-[13px] px-1">Services</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onViewChange?.("earn")} className="layout-grid-item group">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-[12px] mb-0.5">Earn Points</p>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">Complete tasks to earn</p>
                </button>

                <button
                  onClick={() => isOffQueue ? onViewChange?.("verify") : toast({ title: "Queue Locked", description: "Complete the queue to unlock verification." })}
                  className="layout-grid-item group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-[12px] mb-0.5">Verify Spend</p>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">Submit receipts</p>
                </button>

                <button onClick={isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." })} className="layout-grid-item group">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Gift className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-[12px] mb-0.5">Vouchers</p>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">Claim your vouchers</p>
                </button>

                <button onClick={handleShare} className="layout-grid-item group">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Share2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-[12px] mb-0.5">Refer & Earn</p>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">{referralCount} referrals</p>
                </button>
              </div>
            </div>

            {/* Referral Link Card */}
            {referralLink && (
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-muted-foreground font-medium">Your Referral Link</p>
                  <button onClick={handleCopy} className="text-primary text-[11px] font-medium flex items-center gap-1">
                    {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
                <p className="text-[10px] text-foreground font-mono bg-muted/30 rounded-lg p-2 truncate">{referralLink}</p>
              </GlassCard>
            )}

            {/* Referred Users List */}
            {referredUsers.length > 0 && (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[11px] text-muted-foreground font-medium">Your Referred Users ({referredUsers.length})</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {referredUsers.map((ru, i) => {
                    const username = ru.email.split("@")[0];
                    return (
                      <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-[11px] text-foreground font-medium">{username}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ru.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ═══ EARN VIEW ═══ */}
        {view === "earn" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Points Balance</p>
              </div>
              <h2 className="font-display text-2xl font-bold gradient-text">{pointsBalance.toLocaleString()}</h2>
              <p className="text-muted-foreground mt-1 text-[11px]">= {formatNaira(nairaValue)} value</p>
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
                  <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Your Goal</p>
                  <p className="font-semibold text-foreground text-[13px]">GOAL - {goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Claimable</p>
                  <p className="font-semibold text-primary text-[13px]">{formatNaira(nairaValue)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((nairaValue / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-muted-foreground mt-2 text-[11px]">{formatNaira(nairaValue)} / {formatNaira(targetAmount)}</p>
              {claimedTotal > 0 && <p className="text-muted-foreground mt-1 text-[10px]">Already claimed: {formatNaira(claimedTotal)}</p>}
            </GlassCard>

            <GlassButton variant="primary" onClick={isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." })} className="w-full" disabled={!isOffQueue}>
              {!isOffQueue ? (
                <><Lock className="inline w-4 h-4" /> Complete Queue to Claim</>
              ) : (
                <><Wallet className="inline w-4 h-4" /> Claim Amount — Create Voucher</>
              )}
            </GlassButton>
          </motion.div>
        )}

        {/* ═══ VERIFY VIEW ═══ */}
        {view === "verify" && isOffQueue && (
          <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {isVerifyActive ? (
              <>
                <VerifySpendFlow />
                {verifyLink && (
                  <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                    <GlassButton variant="outline" className="w-full">
                      <ExternalLink className="inline w-4 h-4" /> Verify Expense
                    </GlassButton>
                  </a>
                )}
              </>
            ) : (
              <GlassCard variant="strong" className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Coming Soon</h3>
                  <p className="text-[13px] text-muted-foreground max-w-[240px] mx-auto mt-1">
                    Spend verification is currently being updated. Check back soon to verify your spend.
                  </p>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ═══ INFLUENCER VIEW ═══ */}
        {view === "influencer" && (
          <motion.div key="influencer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <InfluencerPanel />
          </motion.div>
        )}

        {/* ═══ NOTIFICATIONS VIEW ═══ */}
        {view === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <NotificationsPanel />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default QueueDisplay;
