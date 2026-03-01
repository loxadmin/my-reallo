import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";

const Verify = () => {
  const { profile } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");
  const isOffQueue = (profile?.queue_position ?? 201) <= 0;

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchLink();
  }, []);

  return (
    <Layout>
      <section className="px-6 max-w-lg mx-auto space-y-6 pb-24">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold gradient-text">Verify Spend</h1>
          <p className="text-sm text-muted-foreground">Validate your annual utility expenses</p>
        </header>

        {isOffQueue ? (
          <div className="space-y-6">
            <GlassCard variant="glow" className="space-y-4 py-8 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

               <div className="relative z-10 space-y-4">
                 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                   <ShieldCheck className="w-8 h-8 text-primary" />
                 </div>
                 <div className="space-y-2">
                   <h3 className="font-display text-xl font-bold text-foreground">Verification Active</h3>
                   <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                     You are now eligible to verify your utility spend. Please upload your documents using the link below.
                   </p>
                 </div>
               </div>
            </GlassCard>

            <div className="space-y-4">
              <VerifySpendFlow />

              {verifyLink && (
                <div className="pt-2">
                  <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block">
                    <GlassButton variant="primary" className="w-full py-4 clay-primary">
                      <ExternalLink className="inline w-4 h-4 mr-2" /> Upload Documents
                    </GlassButton>
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <GlassCard variant="glow" className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold text-muted-foreground">Verification Locked</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                You must reach the front of the queue to unlock expense verification. Keep referring friends to move up!
              </p>
            </GlassCard>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Verify;
