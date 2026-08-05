import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";

import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import DecisionFlow from "./DecisionFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import InfluencerPanel from "./InfluencerPanel";
import NotificationsPanel from "./NotificationsPanel";
import LeaderboardTicker from "./LeaderboardTicker";
import WalletCarousel from "./WalletCarousel";
import ActivateWalletModal from "./ActivateWalletModal";
import ProfilePanel from "./ProfilePanel";
import type { WalletType } from "./WalletCarousel";
import { Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, AlertCircle, CheckCircle2, Star, MessageSquare, ChevronLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "@/pages/Dashboard";
import RecommendedOffers from "./RecommendedOffers";
import GoalAccountFlow from "./GoalAccountFlow";
import GoalAccountCard from "./GoalAccountCard";
import TaskCenter from "./tasks/TaskCenter";
import TaskProgressStrip from "./tasks/TaskProgressStrip";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  view: DashView;
  onViewChange?: (view: DashView) => void;
}



const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

type CategoryVerifStatus = Record<string, boolean>; // spend_type -> verified

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount, view, onViewChange }: QueueDisplayProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { formatCurrency } = useCurrency();
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
  const [activateWallet, setActivateWallet] = useState<"food" | "transport" | null>(null);
  const [categoryVerified, setCategoryVerified] = useState<CategoryVerifStatus>({
    data: false, electricity: false, food: false, transport: false,
  });
  const [categoryToggles, setCategoryToggles] = useState<Record<string, boolean>>({
    data: true, electricity: true, food: true, transport: true,
  });
  // Current wallet context from carousel
  const [walletContext, setWalletContext] = useState<{ walletType: WalletType; showTotal: boolean }>({
    walletType: "utility", showTotal: false,
  });

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
        supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").maybeSingle(),
        supabase.from("vouchers").select("amount_naira").eq("user_id", user.id),
        supabase.from("spend_verifications").select("status, spend_type").eq("user_id", user.id),
        supabase.from("admin_settings").select("value").eq("key", "verify_page_active").maybeSingle(),
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

      // Fetch per-category toggles
      const [dataToggle, elecToggle, foodToggle, transToggle] = await Promise.all([
        supabase.from("admin_settings").select("value").eq("key", "verify_data_active").maybeSingle(),
        supabase.from("admin_settings").select("value").eq("key", "verify_electricity_active").maybeSingle(),
        supabase.from("admin_settings").select("value").eq("key", "verify_food_active").maybeSingle(),
        supabase.from("admin_settings").select("value").eq("key", "verify_transport_active").maybeSingle(),
      ]);

      const toggles: Record<string, boolean> = {
        data: dataToggle.data?.value !== "false",
        electricity: elecToggle.data?.value !== "false",
        food: foodToggle.data?.value !== "false",
        transport: transToggle.data?.value !== "false",
      };
      setCategoryToggles(toggles);

      const isVerifDone = (type: string) => {
        if (!toggles[type]) return true; // disabled = skip = verified
        const v = verifs.find(v => v.spend_type === type);
        return v?.status === "verified" || v?.status === "completed";
      };

      const catVerif: CategoryVerifStatus = {
        data: isVerifDone("data"),
        electricity: isVerifDone("electricity"),
        food: isVerifDone("food"),
        transport: isVerifDone("transport"),
      };
      setCategoryVerified(catVerif);

      setSpendVerified(catVerif.data && catVerif.electricity && catVerif.food && catVerif.transport);
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
      await navigator.share({ title: "Join Karbali", text: "Reclaim your utility spend!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  // Check if current wallet's categories are verified
  const isCurrentWalletVerified = (): boolean => {
    const { walletType, showTotal } = walletContext;
    if (showTotal) {
      // Total mode: ALL must be verified
      return spendVerified;
    }
    // Per-wallet verification
    switch (walletType) {
      case "utility":
        return categoryVerified.data && categoryVerified.electricity;
      case "food":
        return categoryVerified.food;
      case "transport":
        return categoryVerified.transport;
      default:
        return false;
    }
  };

  // Get the claimable cap for the current wallet
  const getCurrentWalletSpend = (): number => {
    const { walletType, showTotal } = walletContext;
    if (showTotal) return totalAnnualSpend;
    switch (walletType) {
      case "utility":
        return (profile?.annual_data_spend ?? 0) + (profile?.annual_electricity_spend ?? 0);
      case "food":
        return profile?.annual_food_spend ?? 0;
      case "transport":
        return profile?.annual_transport_spend ?? 0;
      default:
        return 0;
    }
  };

  const getWalletLabel = (): string => {
    const { walletType, showTotal } = walletContext;
    if (showTotal) return "Total";
    switch (walletType) {
      case "utility": return "Utility";
      case "food": return "Food";
      case "transport": return "Transport";
      default: return "";
    }
  };

  // 4-step claim check (wallet-aware)
  const handleClaimClick = () => {
    if (pointsBalance <= 0) {
      toast({ title: "No Points", description: "You need to earn points before you can claim. Go to the Earn page." });
      return;
    }
    if (!isCurrentWalletVerified()) {
      const label = getWalletLabel();
      toast({ title: "Verify Your Spend", description: `Your ${label} spend is not verified yet. Go to the Verify page.` });
      return;
    }
    if (nairaValue < 50000) {
      toast({ title: "Not Enough Points", description: `You need at least 100,000 points (₦50,000). You have ${pointsBalance.toLocaleString()} points (₦${nairaValue.toLocaleString()}). Earn more points!` });
      return;
    }
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
      supabase.from("profiles").update({ off_queue_at: new Date().toISOString() }).eq("id", user!.id);
      toast({ title: "Goal Not Matured", description: "Your goal savings is less than 6 months and has not reached maturity." });
      return;
    }
    // Pass wallet context to vouchers page
    const walletSpend = getCurrentWalletSpend();
    const label = getWalletLabel();
    navigate(`/vouchers?wallet=${walletContext.walletType}&total=${walletContext.showTotal}&spend=${walletSpend}&label=${label}`);
  };

  const handleWalletContext = useCallback((ctx: { walletType: WalletType; showTotal: boolean }) => {
    setWalletContext(ctx);
  }, []);

  return (
    <section className="min-h-screen flex items-start justify-center px-4 pt-4 pb-32 lg:pt-8 lg:pb-8">
      <div className="w-full max-w-md lg:max-w-2xl space-y-4">
        {/* ═══ HOME VIEW ═══ */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Wallet Card */}
            <GlassCard variant="glow" className="relative overflow-hidden p-5">
              <WalletCarousel
                targetAmount={targetAmount}
                nairaValue={nairaValue}
                pointsBalance={pointsBalance}
                goal={goal}
                goalLabel={goalLabels[goal] || goal}
                onActivateWallet={(type) => setActivateWallet(type)}
                onWalletContext={handleWalletContext}
              >
                <div className="flex gap-2 mt-4">
                  <GlassButton
                    variant="primary"
                    onClick={isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." })}
                    className="flex-1 h-9 rounded-xl text-[11px] whitespace-nowrap px-3"
                    disabled={!isOffQueue}
                  >
                    {isOffQueue ? <><Wallet className="w-3 h-3" /> Claim</> : <><Lock className="w-3 h-3" /> Locked</>}
                  </GlassButton>
                  <GlassButton
                    variant="outline"
                    onClick={() => onViewChange?.("earn")}
                    className="flex-1 h-9 rounded-xl text-[11px] whitespace-nowrap px-3"
                  >
                    <Award className="w-3 h-3" /> Earn
                  </GlassButton>
                </div>
              </WalletCarousel>
            </GlassCard>

            <AnimatePresence>
              {activateWallet && (
                <ActivateWalletModal
                  type={activateWallet}
                  onClose={() => setActivateWallet(null)}
                  onComplete={() => { setActivateWallet(null); refreshProfile(); }}
                />
              )}
            </AnimatePresence>

            {/* Queue Status — compact */}
            {!isOffQueue && (
              <GlassCard className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[12px] font-semibold text-foreground">Queue #{position}</span>
                  </div>
                  <span className="text-[11px] text-primary font-medium">{nextUnlock.hours}h {nextUnlock.minutes}m</span>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, 100 - (position / 5)))}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  50 advance daily · Refer a friend to skip 20 spots
                </p>
              </GlassCard>
            )}

            {isOffQueue && (
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-[12px] font-semibold text-foreground">You're off the queue!</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Verify your spend and start claiming.</p>
              </GlassCard>
            )}

            {/* Referral Link — compact */}
            {referralLink && (
              <GlassCard className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Referral Link</p>
                    <p className="text-[10px] text-foreground font-mono bg-muted/30 rounded-lg px-2 py-1.5 truncate">{referralLink}</p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={handleCopy} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <button onClick={handleShare} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                      <Share2 className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                </div>
                {referralCount > 0 && (
                  <p className="text-[10px] text-primary font-medium mt-2">{referralCount} referral{referralCount !== 1 ? "s" : ""}</p>
                )}
              </GlassCard>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Award, label: "Earn", action: () => onViewChange?.("earn") },
                { icon: isOffQueue ? Check : Lock, label: "Verify", action: () => isOffQueue ? onViewChange?.("verify") : toast({ title: "Queue Locked", description: "Complete the queue to unlock." }) },
                { icon: Gift, label: "Vouchers", action: isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." }) },
                { icon: Star, label: "Influencer", action: () => onViewChange?.("influencer") },
              ].map((item) => (
                <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Referred Users — collapsible */}
            {referredUsers.length > 0 && (
              <GlassCard className="p-3">
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Referred Users ({referredUsers.length})</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {referredUsers.map((ru, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-foreground font-medium">{ru.email.split("@")[0]}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(ru.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* ═══ EARN VIEWS ═══ */}
        {(view === "earn" || view === "offers" || view === "surveys") && (
          <motion.div key="earn-group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Points Balance</p>
              </div>
              <h2 className="font-display text-2xl font-bold gradient-text">{pointsBalance.toLocaleString()}</h2>
              <p className="text-muted-foreground mt-1 text-[11px]">= {formatCurrency(nairaValue)} value</p>
            </GlassCard>

            {view === "earn" && (
              <div className="grid grid-cols-1 gap-4">
                <GoalAccountsSection />
                <TaskCenter onOpenSurveys={() => onViewChange?.("surveys")} />
                <RecommendedOffers />
                <button
                  onClick={() => onViewChange?.("offers")}
                  className="glass-card p-6 flex items-center justify-between group hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">Offers</h3>
                      <p className="text-[12px] text-muted-foreground">browse offers from partner brands to start your financial journey</p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={() => onViewChange?.("surveys")}
                  className="glass-card p-6 flex items-center justify-between group hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">Surveys</h3>
                      <p className="text-[12px] text-muted-foreground">Share your feedback and get rewarded</p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}

            {(view === "offers" || view === "surveys") && (
              <div className="space-y-4">
                <button
                  onClick={() => onViewChange?.("earn")}
                  className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Earn
                </button>
                <DecisionFlow mode={view as "offers" | "surveys"} />
              </div>
            )}
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
                  <p className="font-semibold text-primary text-[13px]">{formatCurrency(nairaValue)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((nairaValue / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-muted-foreground mt-2 text-[11px]">{formatCurrency(nairaValue)} / {formatCurrency(targetAmount)}</p>
              {claimedTotal > 0 && <p className="text-muted-foreground mt-1 text-[10px]">Already claimed: {formatCurrency(claimedTotal)}</p>}
            </GlassCard>

            <GlassButton variant="primary" onClick={isOffQueue ? handleClaimClick : () => toast({ title: "Queue Locked", description: "Complete the queue first." })} className="w-full whitespace-nowrap" disabled={!isOffQueue}>
              {!isOffQueue ? (
                <><Lock className="inline w-4 h-4" /> Complete Queue to Claim {formatCurrency(nairaValue)}</>
              ) : (
                <><Wallet className="inline w-4 h-4" /> Claim {formatCurrency(nairaValue)} — Create Voucher</>
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

        {/* ═══ PROFILE VIEW ═══ */}
        {view === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <ProfilePanel />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default QueueDisplay;

function GoalAccountsSection() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("goal_accounts")
      .select("*").eq("user_id", user.id)
      .in("status", ["active", "completed"])
      .order("opened_at", { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Your Goal Accounts</h3>
        {!showNew && (
          <button onClick={() => setShowNew(true)} className="text-xs text-primary">+ New goal</button>
        )}
      </div>
      {goals.length === 0 && !showNew && (
        <div className="glass-card p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">You don't have a Goal Account yet. Tell the AI what you want to achieve and it will build a funded plan for you.</p>
          <button onClick={() => setShowNew(true)} className="text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Open your first Goal Account
          </button>
        </div>
      )}
      {showNew && (
        <div>
          <GoalAccountFlow onOpened={() => { setShowNew(false); void load(); }} />
          <button onClick={() => setShowNew(false)} className="mt-2 text-xs text-muted-foreground">Cancel</button>
        </div>
      )}
      {goals.map(g => <GoalAccountCard key={g.id} goal={g} onChange={load} />)}
    </div>
  );
}
