import Navbar from "@/components/Navbar";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { ExternalLink, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Verify = () => {
  const { profile } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchLink();
  }, []);

  return (
    <div className="relative min-h-screen pb-24">
      <Navbar />
      <div className="pt-24 px-6 max-w-lg mx-auto space-y-6">
        <GlassCard variant="glow" className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-display mb-1">
            Verification Hub
          </p>
          <h2 className="font-display text-4xl font-bold gradient-text">
            Verify & Reclaim
          </h2>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            Verify your utility spend to unlock higher reclaim amounts and speed up your queue position.
          </p>
        </GlassCard>

        {isOffQueue ? (
          <>
            <VerifySpendFlow />
            {verifyLink && (
              <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                <GlassButton variant="primary" className="w-full py-6 text-base">
                  <ExternalLink className="inline w-5 h-5 mr-2 text-primary-foreground" />
                  Launch Verification Portal
                </GlassButton>
              </a>
            )}
          </>
        ) : (
          <GlassCard className="bg-primary/5 border-primary/20 text-center p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Info className="w-10 h-10 text-primary/60" />
              <div>
                <h4 className="font-display font-bold text-foreground">Verification Coming Soon</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Verification is currently restricted to users who have completed the queue.
                  Focus on earning points and referring friends to skip the wait.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass-stat p-3 rounded-xl flex flex-col items-center">
                <TrendingUp className="w-4 h-4 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground font-display">Priority</p>
                <p className="font-display font-bold">In-Queue</p>
              </div>
              <div className="glass-stat p-3 rounded-xl flex flex-col items-center text-center">
                <ShieldCheck className="w-4 h-4 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground font-display">Status</p>
                <p className="font-display font-bold">Unverified</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default Verify;
