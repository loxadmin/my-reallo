import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, CheckCircle, ShieldCheck } from "lucide-react";

const Verify = () => {
  const { profile } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");
  const isOffQueue = (profile?.queue_position ?? 201) <= 0;

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchSettings();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 glass-pill px-3 py-1 rounded-full mx-auto">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-medium text-primary">Verification Center</span>
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">Verify Expense</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Verify your utility spend to unlock your goal and start claiming back.
          </p>
        </header>

        <GlassCard variant="glow" className="py-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 pulse-glow shadow-inner">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-display font-bold text-xl text-foreground">Secure Verification</h3>
            <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
              We use bank-grade encryption to verify your utility payments safely and securely.
            </p>
          </div>
        </GlassCard>

        {!isOffQueue ? (
          <GlassCard className="text-center py-10 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <h4 className="font-display font-semibold text-foreground">Complete Queue to Access</h4>
            <p className="text-xs text-muted-foreground px-6 leading-relaxed">
              Verification will be available once you reach the front of the queue and activate your reclaim.
            </p>
          </GlassCard>
        ) : (
          <section className="space-y-4">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground px-1">Verify Now</h2>
            <VerifySpendFlow />
            {verifyLink && (
              <a href={verifyLink} target="_blank" rel="noopener noreferrer">
                <GlassButton variant="outline" className="w-full py-4 text-sm font-display font-medium">
                  <ExternalLink className="inline w-4 h-4 mr-2" /> Open External Verification
                </GlassButton>
              </a>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Verify;
