import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import {
  Users, Share2, Copy, Check, TrendingUp, Clock, Zap,
  ExternalLink, Wallet, Award, Target, ShieldCheck,
  ChevronRight, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "./BottomNav";
import { cn } from "@/lib/utils";

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
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [verifyLink, setVerifyLink] = useState("");
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [claimedTotal, setClaimedTotal] = useState(0);
  const [showBalance, setShowBalance] = useState(true);

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
    toast({ title: "Link copied!", description: "Share it to move up the queue." });
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
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* ═══ HOME VIEW ═══ */}
      {view === "home" && (
        <>
          {/* Wallet Hero */}
          <GlassCard variant="glow" className="text-center">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
              {isNext || isOffQueue ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 pulse-glow">
                    <Check className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-bold mb-1">
                    {isOffQueue ? "You're Off the Queue!" : "You're Next!"}
                  </h2>
                  <p className="text-muted-foreground">
                    {isOffQueue ? "Earn points, verify spend & claim your money." : "Activate your reclaim now."}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1">People ahead of you</p>
                  <motion.h2 key={position} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl font-bold">
                    {position}
                  </motion.h2>
                  <p className="text-muted-foreground mt-2">Skip the queue — refer a friend and move up 5 spots.</p>
                </>
              )}
            </motion.div>
          </GlassCard>

          {/* Timer (only when still in queue) */}
          {!isOffQueue && (
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Next Queue Unlock</p>
              </div>
              <div className="flex items-center justify-center gap-4">
                {[
                  { val: nextUnlock.hours, label: "Hours" },
                  { val: nextUnlock.minutes, label: "Min" },
                  { val: nextUnlock.seconds, label: "Sec" },
                ].map((t, i) => (
                  <div key={t.label} className="flex items-center gap-4">
                    {i > 0 && <span className="text-xl text-primary/40 font-bold">:</span>}
                    <div className="text-center min-w-[40px]">
                      <p className="text-2xl font-bold text-foreground tabular-nums">{String(t.val).padStart(2, "0")}</p>
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="text-center p-3" animate={false}>
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-foreground text-lg">{todaySkipped}</p>
              <p className="text-[9px] text-muted-foreground">Skipped Today</p>
            </GlassCard>
            <GlassCard className="text-center p-3" animate={false}>
              <Share2 className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-foreground text-lg">{referralCount}</p>
              <p className="text-[9px] text-muted-foreground">Referrals</p>
            </GlassCard>
            <GlassCard className="text-center p-3" animate={false}>
              <Users className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-foreground text-lg">{position <= 0 ? "✓" : position}</p>
              <p className="text-[9px] text-muted-foreground">Position</p>
            </GlassCard>
          </div>

          {/* Goal section displayed on homepage */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your Goal</p>
                <p className="font-semibold text-foreground">{goalLabels[goal] || goal}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Claimable</p>
                <p className="font-semibold text-primary">{formatNaira(claimableAmount)}</p>
              </div>
            </div>
            <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-[11px] text-muted-foreground">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
              <GlassButton variant="primary" className="py-1 px-3 text-[10px]" onClick={() => navigate("/vouchers")} disabled={!canClaim}>Claim</GlassButton>
            </div>
          </GlassCard>

          {/* Switch tab section (Services Grid) */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold">Our Services</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: "earn", label: "Earn", icon: Award, desc: "Earn Points" },
                { id: "goal", label: "Goal", icon: Target, desc: "Your Goal" },
                { id: "verify", label: "Verify", icon: ShieldCheck, desc: "Verify Spend" },
                { id: "home", label: "Home", icon: Users, desc: "Queue Status" },
              ].map((service) => (
                <button
                  key={service.label}
                  onClick={() => onViewChange?.(service.id as DashView)}
                  className="layout-grid-item p-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <service.icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold mb-0.5">{service.label}</p>
                  <p className="text-[10px] text-muted-foreground">{service.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Referral */}
          <GlassCard variant="strong">
            <h3 className="font-semibold text-foreground mb-2">
              {isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isOffQueue ? "Each referral earns you 1,000 points (₦500). Share your link!" : "For every friend you refer, skip 5 positions."}
            </p>
            {profile?.referral_code && (
              <>
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Your referral code</p>
                <p className="font-bold text-primary text-lg mb-3">{profile.referral_code}</p>
                <div className="flex gap-2">
                  <div className="flex-1 glass-input rounded-xl px-3 py-2.5 text-[11px] text-muted-foreground truncate">{referralLink}</div>
                  <GlassButton variant="outline" onClick={handleCopy} className="px-3">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </GlassButton>
                </div>
                <GlassButton variant="primary" className="w-full mt-3" onClick={handleShare}>
                  <Share2 className="inline w-4 h-4 mr-2" /> {isOffQueue ? "Share & Earn" : "Share Referral Link"}
                </GlassButton>
              </>
            )}
          </GlassCard>
        </>
      )}

      {/* ═══ OTHER VIEWS ═══ */}
      {view !== "home" && (
        <div className="max-w-3xl mx-auto w-full pt-4">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => onViewChange?.("home")}
              className="w-10 h-10 rounded-xl glass-button flex items-center justify-center border-none"
            >
              <ArrowDownLeft className="w-5 h-5 rotate-45" />
            </button>
            <h2 className="text-2xl font-bold capitalize">{view}</h2>
          </div>

          {view === "earn" && (
            <div className="space-y-6">
              <GlassCard variant="strong" className="text-center p-10 bg-primary/5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Points Balance</p>
                <p className="text-5xl font-bold mb-2">{pointsBalance.toLocaleString()}</p>
                <p className="text-[13px] font-semibold text-muted-foreground">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
              </GlassCard>
              <QuestionnaireFlow />
            </div>
          )}

          {view === "goal" && (
            <div className="space-y-6">
              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{goalLabels[goal] || goal}</h3>
                  </div>
                  <Target className="w-10 h-10 text-primary opacity-20" />
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Claimable</p>
                    <p className="text-2xl font-bold text-primary">{formatNaira(claimableAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Amount</p>
                    <p className="text-2xl font-bold">{formatNaira(targetAmount)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {formatNaira(claimableAmount)} / {formatNaira(targetAmount)}
                  </p>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => navigate("/vouchers")}
                  className="w-full py-5 text-[13px]"
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
                {claimedTotal > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">Already claimed: {formatNaira(claimedTotal)}</p>
                )}
              </div>
            </div>
          )}

          {view === "verify" && isOffQueue && (
            <div className="space-y-6">
              <VerifySpendFlow />
              {verifyLink && (
                <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block">
                  <GlassButton variant="outline" className="w-full py-4 font-bold">
                    <ExternalLink className="inline w-4 h-4 mr-2" /> Verify Expense
                  </GlassButton>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueueDisplay;
