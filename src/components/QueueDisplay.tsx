import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import DecisionFlow from "./DecisionFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, Target, LayoutGrid, Eye, Megaphone, ChevronRight } from "lucide-react";
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
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header Greeting */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-foreground uppercase tracking-tight leading-none">
                    HI {user?.email?.split('@')[0]?.toUpperCase() || "USER"},
                  </h3>
                  <p className="text-muted-foreground font-medium mt-1">Welcome back to your dashboard</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary/20" />
              </div>
            </div>

            {/* Goal Balance Hero Card */}
            <GlassCard variant="glow" className="relative overflow-hidden pt-8 pb-8 px-6">
              <div className="absolute -top-6 -right-6 p-4 opacity-5 rotate-12">
                <Target className="w-32 h-32 text-primary" />
              </div>

              <p className="text-muted-foreground uppercase tracking-[0.2em] font-medium mb-1">Goal Balance</p>
              <div className="flex items-center gap-2 mb-6">
                <h2 className="font-display font-bold gradient-text tabular-nums leading-none">
                  {formatNaira(claimableAmount)}
                </h2>
                <button className="p-1 hover:bg-foreground/5 rounded-full transition-colors">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Goal Progress */}
              <div className="space-y-2 mb-8">
                <div className="flex justify-between items-end">
                  <p className="font-semibold text-foreground">{goalLabels[goal] || goal}</p>
                  <p className="text-muted-foreground font-medium">{Math.round((claimableAmount / targetAmount) * 100)}%</p>
                </div>
                <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(15,61,46,0.3)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => navigate("/vouchers")}
                  className="flex-1 h-12 rounded-2xl shadow-lg"
                  disabled={!canClaim}
                >
                  {canClaim ? <><Wallet className="w-4 h-4" /> Claim Voucher</> : <><Lock className="w-4 h-4" /> Claim Voucher</>}
                </GlassButton>
                <GlassButton
                  variant="outline"
                  onClick={() => onViewChange?.("earn")}
                  className="flex-1 h-12 rounded-2xl bg-white/40 backdrop-blur-md"
                >
                  <Award className="w-4 h-4" /> Earn Points
                </GlassButton>
              </div>
            </GlassCard>

            {/* Our Services Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-foreground">Our Services</h3>
                <button className="text-primary font-medium hover:underline">View All</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Major Service 1: Earn */}
                <button
                  onClick={() => onViewChange?.("earn")}
                  className="layout-grid-item group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="font-bold text-foreground mb-1">Earn Points</p>
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">Complete tasks to increase balance</p>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Major Service 2: Verify */}
                <button
                  onClick={() => isOffQueue ? onViewChange?.("verify") : toast({ title: "Queue Locked", description: "Complete the queue to unlock verification." })}
                  className="layout-grid-item group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Check className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-bold text-foreground mb-1">Verify Spend</p>
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">Submit receipts for verification</p>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </div>

              {/* Minor Services Row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Gift, label: "Vouchers", action: () => navigate("/vouchers"), color: "text-purple-600", bg: "bg-purple-50" },
                  { icon: Zap, label: "Queue", action: () => {}, color: "text-amber-600", bg: "bg-amber-50", info: position <= 0 ? "✓" : position.toString() },
                  { icon: TrendingUp, label: "Stats", action: () => {}, color: "text-emerald-600", bg: "bg-emerald-50", info: todaySkipped.toString() },
                  { icon: Clock, label: "Timer", action: () => {}, color: "text-rose-600", bg: "bg-rose-50", info: `${nextUnlock.hours}h` },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="flex flex-col items-center gap-2 group relative"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <span className="font-medium text-muted-foreground">{item.label}</span>
                    {item.info && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full border border-white min-w-[16px] text-center shadow-sm">
                        {item.info}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Referral Banner Section */}
            <div className="pt-2">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-between p-5 rounded-3xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all text-left group overflow-hidden relative"
              >
                <div className="flex-1 relative z-10">
                  <h3 className="text-foreground mb-1">Refer & Earn</h3>
                  <p className="text-muted-foreground max-w-[180px] leading-relaxed">
                    Share a referral link to your friend and get rewarded
                  </p>
                  <div className="mt-4 inline-flex items-center justify-center px-6 py-2 rounded-full bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                    Learn More
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="relative">
                    <Megaphone className="w-16 h-16 text-primary/10 -rotate-12 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Megaphone className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Decorative blob */}
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ EARN VIEW ═══ */}
        {view === "earn" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-muted-foreground uppercase tracking-[0.2em]">Points Balance</p>
              </div>
              <h2 className="font-display font-bold gradient-text">{pointsBalance.toLocaleString()}</h2>
              <p className="text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
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
                  <p className="text-muted-foreground uppercase tracking-widest">Your Goal</p>
                  <p className="font-semibold text-foreground">{goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground uppercase tracking-widest">Claimable</p>
                  <p className="font-semibold text-primary">{formatNaira(claimableAmount)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-muted-foreground mt-2">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
              {claimedTotal > 0 && <p className="text-muted-foreground mt-1 text-[10px]">Already claimed: {formatNaira(claimedTotal)}</p>}
            </GlassCard>

            <GlassButton variant="primary" onClick={() => navigate("/vouchers")} className="w-full" disabled={!canClaim}>
              {!isOffQueue ? (
                <><Lock className="inline w-4 h-4" /> Complete Queue to Claim</>
              ) : claimableAmount < 50000 ? (
                <><Lock className="inline w-4 h-4" /> Min ₦50,000 to Claim</>
              ) : pointsBalance < 100000 ? (
                <><Lock className="inline w-4 h-4" /> Need 100,000 pts to Claim</>
              ) : (
                <><Wallet className="inline w-4 h-4" /> Claim Amount — Create Voucher</>
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
                  <ExternalLink className="inline w-4 h-4" /> Verify Expense
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
