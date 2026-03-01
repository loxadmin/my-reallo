import Navbar from "@/components/Navbar";
import VerifySpendFlow from "@/components/VerifySpendFlow";
import GlassButton from "@/components/GlassButton";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VerificationPage = () => {
  const [verifyLink, setVerifyLink] = useState("");

  useEffect(() => {
    const fetchLink = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "verify_expense_link").single();
      setVerifyLink(data?.value || "");
    };
    fetchLink();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md space-y-4">
          <VerifySpendFlow />
          {verifyLink && (
            <a href={verifyLink} target="_blank" rel="noopener noreferrer">
              <GlassButton variant="outline" className="w-full">
                <ExternalLink className="inline w-4 h-4 mr-2" /> Verify Expense
              </GlassButton>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
