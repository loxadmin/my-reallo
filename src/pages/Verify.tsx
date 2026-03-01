import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import { ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";

const Verify = () => {
  const { user, profile } = useAuth();
  const [verifyLink, setVerifyLink] = useState("");
  const isOffQueue = (profile?.queue_position ?? 999) <= 0;

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "verify_expense_link")
        .single();
      setVerifyLink(data?.value || "");
    };
    fetchSettings();
  }, []);

  if (!isOffQueue) {
    return (
      <div className="pt-32 px-6 flex flex-col items-center justify-center text-center space-y-4">
        <GlassCard variant="strong" className="max-w-xs">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Verification Locked</h2>
          <p className="text-sm text-muted-foreground">
            Complete the waitlist queue to unlock spend verification and claim your money.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 px-1 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Verification</h1>
      </div>

      <VerifySpendFlow />

      {verifyLink && (
        <GlassCard variant="strong" className="space-y-4">
          <h3 className="font-display font-bold">External Verification</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click below to verify your utility expenses through our secure partner portal.
          </p>
          <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block">
            <GlassButton variant="primary" className="w-full">
              <ExternalLink className="inline w-4 h-4 mr-2" />
              Launch Portal
            </GlassButton>
          </a>
        </GlassCard>
      )}
    </div>
  );
};

export default Verify;
