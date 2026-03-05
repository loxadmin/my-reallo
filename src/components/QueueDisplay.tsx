import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import DecisionFlow from "./DecisionFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { DashView } from "@/pages/Dashboard";
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
  const { user, profile } = useAuth();
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
    <section className="min-h-screen flex items-start justify-center px-4 pt-4 pb-12 lg:pt-8 lg:pb-8">
      <div className="w-full max-w-md lg:max-w-2xl space-y-4">
        {/* ═══ HOME VIEW ═══ */}
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Goal Balance Hero Card */}
            <GlassCard variant="glow" className="relative overflow-hidden p-5">
              <p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px] font-medium mb-1">Goal Balance</p>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display text-2xl font-bold gradient-text tabular-nums leading-none">
                  {formatNaira(claimableAmount)}
                </h2>
              </div>

              {/* Goal Progress */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between items-end">
                  <p className="font-medium text-foreground text-[12px]">{goalLabels[goal] || goal}</p>
                  <p className="text-muted-foreground text-[11px]">{Math.round((claimableAmount / targetAmount) * 100)}%</p>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <GlassButton
                  variant="primary"
                  onClick={() => navigate("/vouchers")}
                  className="flex-1 h-10 rounded-xl text-[12px]"
                  disabled={!canClaim}
                >
                  {canClaim ? <><Wallet className="w-3.5 h-3.5" /> Claim</> : <><Lock className="w-3.5 h-3.5" /> Claim</>}
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

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Queue", value: isOffQueue ? "✓" : position.toString(), icon: Zap },
                { label: "Points", value: pointsBalance.toLocaleString(), icon: Award },
                { label: "Skipped", value: todaySkipped.toString(), icon: TrendingUp },
                { label: "Timer", value: `${nextUnlock.hours}h ${nextUnlock.minutes}m`, icon: Clock },
              ].map((item, idx) => (
                <div key={idx} className="glass-stat rounded-xl p-3 text-center">
                  <item.icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <p className="text-[12px] font-bold text-foreground leading-none">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

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

                <button onClick={() => navigate("/vouchers")} className="layout-grid-item group">
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
              <p className="text-muted-foreground mt-1 text-[11px]">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
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
                  <p className="font-semibold text-foreground text-[13px]">{goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Claimable</p>
                  <p className="font-semibold text-primary text-[13px]">{formatNaira(claimableAmount)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-muted-foreground mt-2 text-[11px]">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
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
