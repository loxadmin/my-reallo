import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Wallet, TrendingUp, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BusinessDashboard = () => {
  const { profile, refreshProfile } = useAuth();
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<"none" | "no_bank" | null>(null);

  if (!profile) return null;

  const monthly = profile.monthly_business_spend || 0;
  const credit = profile.credit_line || 0;
  const verified = profile.credit_line_verified;

  const handleClaim = async () => {
    if (!verified) {
      toast({ title: "Verify your expenses first", description: "Complete verification to unlock financing." });
      return;
    }
    setSearching(true);
    setSearchResult(null);
    // Simulate searching for a microfinance bank
    await new Promise(r => setTimeout(r, 3500));
    setSearching(false);
    setSearchResult("no_bank");
    await supabase.from("profiles").update({
      financing_claimed_at: new Date().toISOString(),
    } as any).eq("id", profile.id);
    await refreshProfile();
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-xl font-bold mb-1">Welcome back</h1>
        <p className="text-[12px] text-muted-foreground capitalize">
          {profile.business_category?.replace("_", " ") || "Business"} account
        </p>
      </motion.div>

      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-[14px] font-semibold">Monthly business spend</h2>
        </div>
        <p className="text-3xl font-bold gradient-text">₦{monthly.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Based on items you declared at signup</p>
      </GlassCard>

      <GlassCard variant="glow" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-[14px] font-semibold">Credit line</h2>
          </div>
          {verified ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Unverified</span>
          )}
        </div>
        <p className="text-3xl font-bold text-foreground">₦{credit.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Short-term loan · 1.8% over 14 days · Provided by partner microfinance bank
        </p>

        <GlassButton
          variant="primary"
          onClick={handleClaim}
          disabled={searching}
          className="w-full mt-4"
        >
          {searching ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching for microfinance bank…</span>
          ) : (
            "Claim financing"
          )}
        </GlassButton>

        {!verified && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Complete verification in the <strong>Verify</strong> tab to unlock claiming.
          </p>
        )}

        {searchResult === "no_bank" && (
          <div className="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground">
              No microfinance bank available right now. Please try again later — we'll notify you when one comes online.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default BusinessDashboard;