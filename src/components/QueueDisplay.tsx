import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import QuestionnaireFlow from "./QuestionnaireFlow";
import VerifySpendFlow from "./VerifySpendFlow";
import { Users, Share2, Copy, Check, TrendingUp, Clock, Zap, ExternalLink, Wallet, Award, Gift, Lock, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
  isIntegrated?: boolean;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const goalLabels: Record<string, string> = {
  education: "Education",
  vacation: "Vacation",
  business: "Business Funding",
  rent: "Rent Support",
};

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount, isIntegrated = false }: QueueDisplayProps) => {
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

  const content = (
    <div className="w-full space-y-4">
      {/* Integrated View: Show current queue info more compactly */}
      {isIntegrated && (
        <GlassCard variant="strong" className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Queue Position</p>
                <p className="font-display font-bold text-lg text-foreground">
                  {isOffQueue ? "Off Queue" : `#${position}`}
                </p>
              </div>
            </div>
            {!isOffQueue && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-display">Next Unlock</p>
                <p className="font-display font-mono font-medium text-primary">
                  {String(nextUnlock.hours).padStart(2, '0')}:{String(nextUnlock.minutes).padStart(2, '0')}:{String(nextUnlock.seconds).padStart(2, '0')}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Main activities */}
      <Tabs defaultValue="earn" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/30 backdrop-blur-sm rounded-xl p-1 h-auto">
          <TabsTrigger value="earn" className="font-display text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all">
            <Award className="w-3.5 h-3.5 mr-1.5" /> Earn
          </TabsTrigger>
          <TabsTrigger value="goal" className="font-display text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all">
            <Gift className="w-3.5 h-3.5 mr-1.5" /> Goal
          </TabsTrigger>
          <TabsTrigger value="refer" className="font-display text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all">
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Refer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earn" className="space-y-4 mt-4">
          <GlassCard variant="glow" className="text-center py-4 px-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Points Balance</p>
            </div>
            <p className="font-display text-4xl font-bold text-foreground">{pointsBalance.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Valued at {formatNaira(Math.floor(pointsBalance * 0.5))}</p>
          </GlassCard>
          <QuestionnaireFlow />
        </TabsContent>

        <TabsContent value="goal" className="space-y-4 mt-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Active Goal</p>
                <p className="font-display font-bold text-foreground">{goalLabels[goal] || goal}</p>
              </div>
              <Target className="w-5 h-5 text-primary/60" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-display">Progress</span>
                <span className="text-primary font-bold">{Math.floor((claimableAmount / targetAmount) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((claimableAmount / targetAmount) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatNaira(claimableAmount)}</span>
                <span>Target: {formatNaira(targetAmount)}</span>
              </div>
            </div>
          </GlassCard>

          <GlassButton
            variant="primary"
            onClick={() => navigate("/vouchers")}
            className="w-full py-4 text-base"
            disabled={!canClaim}
          >
            {!isOffQueue ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Complete Queue to Claim</>
            ) : claimableAmount < 50000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Min ₦50,000 to Claim</>
            ) : pointsBalance < 100000 ? (
              <><Lock className="inline w-4 h-4 mr-2" /> Need 100,000 pts to Claim</>
            ) : (
              <><Wallet className="inline w-4 h-4 mr-2" /> Claim {formatNaira(claimableAmount)}</>
            )}
          </GlassButton>
        </TabsContent>

        <TabsContent value="refer" className="space-y-4 mt-4">
          <GlassCard variant="strong" className="p-5">
            <h3 className="font-display font-bold text-foreground mb-1 text-base">Invite Friends</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {isOffQueue
                ? "Earn 1,000 points (₦500) per referral."
                : "Skip 5 positions for every successful referral."}
            </p>
            {profile?.referral_code && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 glass-input rounded-xl px-4 py-3 text-xs text-foreground font-mono truncate bg-background/20">{profile.referral_code}</div>
                  <GlassButton variant="outline" onClick={handleCopy} className="px-4">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </GlassButton>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-stat p-3 text-center rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase font-display mb-0.5">Referrals</p>
                    <p className="font-display font-bold text-foreground">{referralCount}</p>
                  </div>
                  <div className="glass-stat p-3 text-center rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase font-display mb-0.5">Moved Up</p>
                    <p className="font-display font-bold text-primary">{todaySkipped} spots</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isIntegrated) {
    return content;
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {content}
      </div>
    </section>
  );
};

export default QueueDisplay;
