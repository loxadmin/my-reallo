import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { ExternalLink, ShieldCheck, CheckCircle, Info } from "lucide-react";

const Verify = () => {
  const { profile, loading } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchLink();
  }, []);

  if (loading || !profile) return null;

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  if (!isOffQueue) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <Navbar />
        <section className="min-h-screen flex items-center justify-center px-4">
          <GlassCard className="text-center max-w-sm space-y-4">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="font-display text-xl font-bold">Access Locked</h2>
            <p className="text-sm text-muted-foreground">Verification is only available after completing the queue.</p>
          </GlassCard>
        </section>
        <BottomNav active="verify" onChange={() => {}} showVerify={false} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <Navbar />

      <section className="min-h-screen flex items-start justify-center px-4 pt-24 pb-32">
        <div className="w-full max-w-md space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Verify Spend
              </h1>
              <p className="text-sm text-muted-foreground">Confirm your utility expenses to unlock claims</p>
            </div>

            <GlassCard variant="glow" className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs leading-relaxed">
                  Verification ensures that your claimed amounts match your actual annual utility spending patterns.
                </p>
              </div>

              <VerifySpendFlow />

              {verifyLink && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3 text-center">External verification portal</p>
                  <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                    <GlassButton variant="outline" className="w-full py-4 text-sm">
                      Open Verification Portal <ExternalLink className="w-4 h-4 ml-2" />
                    </GlassButton>
                  </a>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <BottomNav active="verify" onChange={() => {}} showVerify={true} />
    </div>
  );
};

export default Verify;
