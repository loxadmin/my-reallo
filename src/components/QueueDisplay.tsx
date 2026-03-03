import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, Target, ShieldCheck } from "lucide-react";
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
    <section className="w-full space-y-8">
      {/* ═══ HOME VIEW ═══ */}
      {view === "home" && (
        <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Wallet Hero */}
          <div className="glass-card bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-12 shadow-[0_0_60px_rgba(37,99,235,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-all duration-500 group-hover:bg-accent/20" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <p className="text-muted-foreground text-xs md:text-sm font-medium mb-1">Total Balance</p>
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground truncate max-w-[200px] md:max-w-none">
                    {formatNaira(totalAnnualSpend)}
                  </h1>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                   <Wallet className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
              </div>

              {/* Goal Progress Card integrated into Hero */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                       <Target className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">Active Goal</p>
                      <p className="font-semibold text-foreground text-sm md:text-base truncate">{goalLabels[goal] || goal}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Progress</p>
                    <p className="font-bold text-accent text-sm md:text-base">{Math.round(Math.min((claimableAmount / targetAmount) * 100, 100))}%</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-600 to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-[10px] md:text-xs">
                  <span className="text-muted-foreground truncate mr-2">{formatNaira(claimableAmount)} reached</span>
                  <span className="text-muted-foreground shrink-0">Target: {formatNaira(targetAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
                <button className="px-4 md:px-8 py-3 rounded-xl bg-white/10 border border-white/10 font-semibold text-foreground text-sm md:text-base hover:bg-white/20 transition-all duration-300">
                  Withdraw
                </button>
                <button className="px-4 md:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-accent font-semibold text-white text-sm md:text-base shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 transition-all duration-300">
                  Deposit
                </button>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">Our Services</h2>
              <button className="text-sm text-accent font-semibold hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              <div
                onClick={() => navigate("/dashboard")}
                className="layout-grid-item cursor-pointer group hover:border-accent/40 hover:shadow-[0_0_25px_rgba(37,99,235,0.2)]"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-accent" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-1 md:mb-2 text-foreground">Earn Points</h3>
                <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-none">
                  Complete tasks and answer questions to earn points.
                </p>
              </div>

              <div
                onClick={() => navigate("/dashboard")}
                className="layout-grid-item cursor-pointer group hover:border-accent/40 hover:shadow-[0_0_25px_rgba(37,99,235,0.2)]"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-accent" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-1 md:mb-2 text-foreground">Verify Spend</h3>
                <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-none">
                  Securely verify your utility expenses to qualify.
                </p>
              </div>

              <div
                onClick={() => navigate("/vouchers")}
                className="layout-grid-item cursor-pointer group hover:border-accent/40 hover:shadow-[0_0_25px_rgba(37,99,235,0.2)]"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Gift className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-accent" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-1 md:mb-2 text-foreground">Claim Goal</h3>
                <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-none">
                  Redeem your accumulated value towards your life goals.
                </p>
              </div>

              <div className="layout-grid-item group opacity-50 cursor-not-allowed">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 md:mb-6">
                  <Lock className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-1 md:mb-2 text-foreground">History</h3>
                <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-none">
                  Track all your past reclaims and activity.
                </p>
              </div>
            </div>
          </div>

          {/* Referral Section */}
          <div className="bg-gradient-to-r from-blue-600/10 to-accent/10 border border-blue-500/20 rounded-3xl p-6 md:p-12 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 overflow-hidden relative group">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative z-10 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-bold text-foreground mb-2 md:mb-4">
                {isOffQueue ? "Refer & Earn Rewards" : "Refer & Skip the Queue"}
              </h3>
              <p className="text-muted-foreground text-sm md:text-lg max-w-md">
                Invite friends to Reallo and earn 1,000 points or move up 5 spots in the queue.
              </p>
            </div>

            <button
              onClick={handleShare}
              className="relative z-10 w-full md:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-accent rounded-xl font-bold text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <Share2 className="w-5 h-5" />
              Get Referral Link
            </button>
          </div>

          {/* Stats and Queue Position (Small cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="glass-card flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                   <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Queue Position</p>
                   <p className="text-2xl font-bold text-foreground">{position <= 0 ? "Off Queue" : `#${position}`}</p>
                </div>
             </div>

             <div className="glass-card flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                   <Clock className="w-6 h-6 text-accent" />
                </div>
                <div>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Next Unlock</p>
                   <p className="text-2xl font-bold text-foreground">{String(nextUnlock.hours).padStart(2, '0')}:{String(nextUnlock.minutes).padStart(2, '0')}</p>
                </div>
             </div>

             <div className="glass-card flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                   <Award className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Points</p>
                   <p className="text-2xl font-bold text-foreground">{pointsBalance.toLocaleString()}</p>
                </div>
             </div>
          </div>
        </motion.div>
      )}

        {/* ═══ EARN VIEW ═══ */}
        {view === "earn" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-blue-500" />
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-[0.2em]">Points Balance</p>
              </div>
              <p className="font-display text-3xl font-bold text-blue-500">{pointsBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
            </GlassCard>
            <QuestionnaireFlow />
          </motion.div>
        )}

        {/* ═══ GOAL VIEW ═══ */}
        {view === "goal" && (
          <motion.div key="goal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Your Goal</p>
                  <p className="font-display font-semibold text-foreground">{goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Claimable</p>
                  <p className="font-display font-semibold text-primary">{formatNaira(claimableAmount)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
              {claimedTotal > 0 && <p className="text-[10px] text-muted-foreground mt-1">Already claimed: {formatNaira(claimedTotal)}</p>}
            </GlassCard>

            <GlassButton variant="primary" onClick={() => navigate("/vouchers")} className="w-full" disabled={!canClaim}>
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
                <GlassButton variant="outline" className="w-full">
                  <ExternalLink className="inline w-4 h-4 mr-2" /> Verify Expense
                </GlassButton>
              </a>
            )}
          </motion.div>
        )}
    </section>
  );
};

export default QueueDisplay;
