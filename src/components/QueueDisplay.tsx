import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Wallet, Award, Gift, Lock, Target, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "./BottomNav";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  view: DashView;
  onViewChange: (view: DashView) => void;
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

  const position = profile?.queue_position ?? 201;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

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
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Reallo", text: "Reclaim your utility spend!", url: referralLink });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  if (!profile) return null;

  return (
    <section className="min-h-screen flex items-start justify-center px-4 pt-24 pb-28">
      <div className="w-full max-w-md lg:max-w-4xl space-y-6">
        {/* ═══ HOME VIEW ═══ */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Fintech Header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Good morning,</p>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{profile.full_name || "User"}</h2>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Balance Card */}
              <GlassCard variant="glow" className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30 flex flex-col justify-center min-h-[200px]">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet className="w-24 h-24 md:w-32 md:h-32" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Claimable Balance</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground tabular-nums">
                    {formatNaira(claimableAmount)}
                  </h1>
                  <div className="p-1 rounded-full bg-primary/10">
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <GlassButton variant="primary" className="flex-1 py-2.5 text-xs font-bold" onClick={() => navigate("/vouchers")} disabled={!canClaim}>
                    <Wallet className="w-3.5 h-3.5 mr-2" /> Claim
                  </GlassButton>
                  <GlassButton variant="outline" className="flex-1 py-2.5 text-xs font-semibold" onClick={() => onViewChange("verify")}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verify Amount
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Goal Progress Section */}
              <div className="space-y-3 flex flex-col justify-end">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-foreground">Active Goal</h3>
                  <button onClick={() => onViewChange("goal")} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">View Details</button>
                </div>
                <GlassCard className="p-6 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 shadow-sm">
                        <Target className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{goalLabels[goal] || goal}</p>
                        <p className="text-xs text-muted-foreground">Target: {formatNaira(targetAmount)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{Math.round((claimableAmount / targetAmount) * 100)}%</p>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Services Grid (Tab Switchers) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground px-1">Our Services</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => onViewChange("earn")} className="flex flex-col items-start p-4 rounded-2xl glass-card hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Earn Points</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Complete tasks to earn points.</p>
                </button>
                <button onClick={() => onViewChange("verify")} className="flex flex-col items-start p-4 rounded-2xl glass-card hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Verify Spend</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Upload receipts to verify.</p>
                </button>
                <button onClick={() => navigate("/vouchers")} className="flex flex-col items-start p-4 rounded-2xl glass-card hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Gift className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Vouchers</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Convert balance to vouchers.</p>
                </button>
                <button onClick={() => onViewChange("home")} className="flex flex-col items-start p-4 rounded-2xl glass-card hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/20 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Activity</p>
                  <p className="text-[10px] text-muted-foreground mt-1">View history and stats.</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Refer & Earn Banner */}
              <GlassCard className="relative overflow-hidden bg-primary p-6 border-none flex flex-col justify-center min-h-[160px]">
                <div className="absolute -right-6 -bottom-6 opacity-20 rotate-12">
                  <Share2 className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10 flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white">Refer & Earn</h3>
                  <p className="text-xs text-white/80 mb-4 max-w-[240px]">
                    Invite your friends and move {isOffQueue ? "up" : "5 spots up"} in the queue!
                  </p>
                  <div className="flex gap-2">
                    <GlassButton variant="default" className="bg-white/20 hover:bg-white/30 border-none text-white text-[10px] py-2 px-6" onClick={handleShare}>
                      Invite Now
                    </GlassButton>
                    <button onClick={handleCopy} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Original Queue Info (Smaller) */}
              {!isOffQueue && (
                <div className="flex flex-col justify-center gap-4">
                  <GlassCard variant="strong" className="flex items-center justify-between py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Queue Position</p>
                        <p className="text-lg font-bold text-foreground">{position}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Next Unlock</p>
                      <p className="text-lg font-bold text-primary tabular-nums">
                        {String(nextUnlock.hours).padStart(2, "0")}:{String(nextUnlock.minutes).padStart(2, "0")}:{String(nextUnlock.seconds).padStart(2, "0")}
                      </p>
                    </div>
                  </GlassCard>
                  <div className="px-2">
                    <p className="text-[10px] text-muted-foreground text-center italic">
                      "Patience is the companion of wisdom." Keep earning points to move up!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ EARN VIEW ═══ */}
        {view === "earn" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <p className="text-xs text-muted-foreground font-display uppercase tracking-[0.2em] font-bold">Points Balance</p>
              </div>
              <p className="font-display text-5xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-2">= {formatNaira(Math.floor(pointsBalance * 0.5))} estimated value</p>
            </GlassCard>
            <QuestionnaireFlow />
          </motion.div>
        )}

        {/* ═══ GOAL VIEW ═══ */}
        {view === "goal" && (
          <motion.div key="goal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs text-muted-foreground font-display uppercase tracking-widest font-bold mb-1">Your Selected Goal</p>
                  <h2 className="font-display text-2xl font-bold text-foreground">{goalLabels[goal] || goal}</h2>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Target className="w-8 h-8 text-accent" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-sm text-muted-foreground">Progress to Target</p>
                  <p className="text-lg font-bold text-primary">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
                </div>
                {claimedTotal > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    <span>Already claimed</span>
                    <span>{formatNaira(claimedTotal)}</span>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassButton variant="primary" onClick={() => navigate("/vouchers")} className="w-full py-6 text-lg font-bold" disabled={!canClaim}>
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
          </motion.div>
        )}

        {/* ═══ VERIFY VIEW ═══ */}
        {view === "verify" && isOffQueue && (
          <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <VerifySpendFlow />
            {verifyLink && (
              <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                <GlassButton variant="outline" className="w-full">
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
