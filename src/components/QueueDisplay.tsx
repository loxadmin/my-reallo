import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount }: QueueDisplayProps) => {
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
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md space-y-4">
        {/* Queue position */}
        <GlassCard variant="glow" className="text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            {isNext || isOffQueue ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold gradient-text mb-2">
                  {isOffQueue ? "You're Off the Queue!" : "You're Next!"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isOffQueue ? "Earn points, verify spend & claim your money." : "Activate your reclaim now."}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-display mb-1">People ahead of you</p>
                <motion.h2 key={position} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-5xl font-bold gradient-text">
                  {position}
                </motion.h2>
                <p className="text-sm text-muted-foreground mt-3">Skip the queue — refer a friend and move up 5 spots.</p>
              </>
            )}
          </motion.div>
        </GlassCard>

        {/* Main tabs */}
        <Tabs defaultValue="earn" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/30 backdrop-blur-sm rounded-xl">
            <TabsTrigger value="earn" className="font-display text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
              <Award className="w-3 h-3 mr-1" /> Earn
            </TabsTrigger>
            <TabsTrigger value="goal" className="font-display text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
              <Gift className="w-3 h-3 mr-1" /> Goal
            </TabsTrigger>
            {isOffQueue && (
              <TabsTrigger value="verify" className="font-display text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                <ExternalLink className="w-3 h-3 mr-1" /> Verify
              </TabsTrigger>
            )}
          </TabsList>

          {/* Earn Points Tab */}
          <TabsContent value="earn" className="space-y-4 mt-4">
            {/* Points balance */}
            <GlassCard variant="strong" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
              </div>
              <p className="font-display text-3xl font-bold gradient-text">{pointsBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">= {formatNaira(Math.floor(pointsBalance * 0.5))} value</p>
            </GlassCard>

            {/* Questionnaires */}
            <QuestionnaireFlow />
          </TabsContent>

          {/* Goal / Claim Tab */}
          <TabsContent value="goal" className="space-y-4 mt-4">
            {/* Goal summary */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-display">Your Goal</p>
                  <p className="font-display font-semibold text-foreground">{goalLabels[goal] || goal}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-display">Claimable</p>
                  <p className="font-display font-semibold text-primary">{formatNaira(claimableAmount)}</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{formatNaira(claimableAmount)} / {formatNaira(targetAmount)}</p>
              {claimedTotal > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">Already claimed: {formatNaira(claimedTotal)}</p>
              )}
            </GlassCard>

            {/* Claim button */}
            <GlassButton
              variant="primary"
              onClick={() => navigate("/vouchers")}
              className="w-full"
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
          </TabsContent>

          {/* Verify Spend Tab (off-queue only) */}
          {isOffQueue && (
            <TabsContent value="verify" className="space-y-4 mt-4">
              <VerifySpendFlow />
              {verifyLink && (
                <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                  <GlassButton variant="outline" className="w-full">
                    <ExternalLink className="inline w-4 h-4 mr-2" /> Verify Expense
                  </GlassButton>
                </a>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Timer (only when still in queue) */}
        {!isOffQueue && (
          <GlassCard variant="strong" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-display uppercase tracking-widest">Next Queue Unlock</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              {[
                { val: nextUnlock.hours, label: "Hours" },
                { val: nextUnlock.minutes, label: "Min" },
                { val: nextUnlock.seconds, label: "Sec" },
              ].map((t, i) => (
                <div key={t.label} className="flex items-center gap-3">
                  {i > 0 && <span className="font-display text-xl text-primary font-bold">:</span>}
                  <div className="text-center">
                    <p className="font-display text-2xl font-bold text-foreground">{String(t.val).padStart(2, "0")}</p>
                    <p className="text-[10px] text-muted-foreground">{t.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-primary" /> 10 users unlock & move up every day
            </p>
          </GlassCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center p-4">
            <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-display font-bold text-foreground">{todaySkipped}</p>
            <p className="text-[10px] text-muted-foreground">Skipped Today</p>
          </GlassCard>
          <GlassCard className="text-center p-4">
            <Share2 className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-display font-bold text-foreground">{referralCount}</p>
            <p className="text-[10px] text-muted-foreground">Referrals</p>
          </GlassCard>
          <GlassCard className="text-center p-4">
            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-display font-bold text-foreground">{position <= 0 ? "✓" : position}</p>
            <p className="text-[10px] text-muted-foreground">Position</p>
          </GlassCard>
        </div>

        {/* Referral */}
        <GlassCard variant="strong">
          <h3 className="font-display font-semibold text-foreground mb-3">
            {isOffQueue ? "Refer & Earn Points" : "Refer & Skip the Queue"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOffQueue
              ? "Each referral earns you 1,000 points (₦500). Share your link!"
              : "For every friend you refer, skip 5 positions."}
          </p>
          {profile?.referral_code && (
            <>
              <p className="text-xs text-muted-foreground mb-1 font-display">Your referral code</p>
              <p className="font-display font-bold text-primary text-lg mb-3">{profile.referral_code}</p>
              <div className="flex gap-2">
                <div className="flex-1 glass-input rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate">{referralLink}</div>
                <GlassButton variant="outline" onClick={handleCopy} className="px-3">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </GlassButton>
              </div>
              <GlassButton variant="primary" className="w-full mt-4" onClick={handleShare}>
                <Share2 className="inline w-4 h-4 mr-2" /> {isOffQueue ? "Share & Earn" : "Share Referral Link"}
              </GlassButton>
            </>
          )}
        </GlassCard>
      </div>
    </section>
  );
};

export default QueueDisplay;
