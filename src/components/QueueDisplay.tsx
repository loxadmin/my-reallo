import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Zap } from "lucide-react";
import GlassCard from "./GlassCard";
import QueueStatus from "./QueueStatus";
import ReferralSection from "./ReferralSection";
import QuickStats from "./QuickStats";

interface QueueDisplayProps {
  totalAnnualSpend: number;
  goal: string;
  targetAmount: number;
}

const QueueDisplay = ({ totalAnnualSpend, goal, targetAmount }: QueueDisplayProps) => {
  const { user, profile } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [todaySkipped, setTodaySkipped] = useState(0);
  const [nextUnlock, setNextUnlock] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const position = profile?.queue_position ?? 201;
  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const isNext = position <= 1;
  const isOffQueue = position <= 0;

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
      const [refRes, actRes] = await Promise.all([
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", profile.id),
        supabase.from("waitlist_activity").select("positions_moved").eq("user_id", profile.id).gte("created_at", new Date().toISOString().split("T")[0]),
      ]);
      setReferralCount(refRes.count || 0);
      setTodaySkipped((actRes.data || []).reduce((sum, a) => sum + (a.positions_moved || 0), 0));
    };
    fetchStats();
  }, [profile, user]);

  return (
    <section className="flex flex-col items-center justify-center px-6 py-20 pb-32">
      <div className="w-full max-w-md space-y-6">

        <QueueStatus position={position} isNext={isNext} isOffQueue={isOffQueue} />

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

        <QuickStats todaySkipped={todaySkipped} referralCount={referralCount} position={position} />

        <ReferralSection
          referralCode={profile?.referral_code || ""}
          referralLink={referralLink}
          isOffQueue={isOffQueue}
        />

      </div>
    </section>
  );
};

export default QueueDisplay;
