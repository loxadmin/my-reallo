import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import GlassButton from "@/components/GlassButton";
import { ExternalLink, ShieldCheck } from "lucide-react";

const Verify = () => {
  const [verifyLink, setVerifyLink] = useState("");

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

  return (
    <div className="container max-w-md mx-auto py-20 px-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Verify Spend</h1>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Verify your utility expenses to qualify for reclaim. Your data is encrypted and used only for verification purposes.
      </p>

      <VerifySpendFlow />

      {verifyLink && (
        <a href={verifyLink} target="_blank" rel="noopener noreferrer" className="block mt-6">
          <GlassButton variant="outline" className="w-full py-4">
            <ExternalLink className="inline w-4 h-4 mr-2" /> Open External Verification
          </GlassButton>
        </a>
      )}
    </div>
  );
};

export default Verify;
