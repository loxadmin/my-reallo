import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { ExternalLink, CheckCircle, Info, ShieldCheck, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const Verify = () => {
  const { profile } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");
  const position = profile?.queue_position ?? 201;
  const isOffQueue = position <= 0;

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchLink();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-display tracking-tight">Verify</h1>
          <p className="text-muted-foreground text-sm font-medium">Verify your utility spend.</p>
        </div>

        {isOffQueue ? (
          <>
            <GlassCard variant="glow" className="bg-blue-500/5 border-blue-500/20 p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">Secure Verification</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
                    Upload your electricity bills or bank statements. Our team will review them to authorize your claimable amount.
                  </p>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-lg">Documents</h2>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">
                   Required
                </span>
              </div>

              <VerifySpendFlow />

              {verifyLink && (
                <div className="pt-2">
                  <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest mb-3">Or use our portal</p>
                  <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block">
                    <GlassButton variant="outline" className="w-full py-5 rounded-2xl text-base font-bold group">
                      <ExternalLink className="inline w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Verify Expense
                    </GlassButton>
                  </a>
                </div>
              )}
            </div>
          </>
        ) : (
          <GlassCard variant="strong" className="py-16 px-8 text-center border-amber-500/20 bg-amber-500/5">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">Access Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-[240px] mx-auto font-medium leading-relaxed">
                Verification is currently locked. You must reach the front of the queue to begin this process.
              </p>
            </div>

            <div className="mt-10 p-4 rounded-2xl bg-background/50 border border-border inline-block">
               <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Your Position</p>
               <p className="text-3xl font-bold font-display text-amber-500">{position}</p>
            </div>
          </GlassCard>
        )}

        <div className="p-6 rounded-3xl border border-border/50 bg-muted/20 flex gap-4 items-center">
           <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
             <Info className="w-4 h-4 text-muted-foreground" />
           </div>
           <p className="text-[11px] text-muted-foreground font-medium leading-tight">
             Typical verification takes 2-3 business days after submission.
           </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Verify;
