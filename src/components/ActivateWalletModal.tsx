import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UtensilsCrossed, Car, ArrowRight } from "lucide-react";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ActivateWalletModalProps {
  type: "food" | "transport";
  onClose: () => void;
  onComplete: () => void;
}

const ActivateWalletModal = ({ type, onClose, onComplete }: ActivateWalletModalProps) => {
  const { user, refreshProfile } = useAuth();
  const { formatCurrency, currency } = useCurrency();
  const [weeklyAmount, setWeeklyAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");

  const annualAmount = Number(weeklyAmount) * 52;
  const label = type === "food" ? "Food" : "Transport";
  const Icon = type === "food" ? UtensilsCrossed : Car;

  const handleConfirm = async () => {
    if (!user) return;
    const field = type === "food" ? "annual_food_spend" : "annual_transport_spend";

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: annualAmount })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save. Try again." });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("annual_data_spend, annual_electricity_spend, annual_food_spend, annual_transport_spend")
      .eq("id", user.id)
      .single();

    if (profile) {
      const total =
        (profile.annual_data_spend ?? 0) +
        (profile.annual_electricity_spend ?? 0) +
        (profile.annual_food_spend ?? 0) +
        (profile.annual_transport_spend ?? 0);

      await supabase.from("profiles").update({ total_annual_spend: total }).eq("id", user.id);
    }

    await refreshProfile();
    toast({ title: `${label} Spend Saved`, description: `Annual ${label.toLowerCase()} spend: ${formatCurrency(annualAmount)}` });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md"
      >
        <GlassCard variant="glow" className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>

          <AnimatePresence mode="wait">
            {step === "input" && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{label} Spend</h2>
                    <p className="text-[13px] text-muted-foreground">How much per week?</p>
                  </div>
                </div>
                <GlassInput
                  label={`Weekly ${label.toLowerCase()} spend`}
                  prefix={currency.symbol}
                  type="number"
                  placeholder="e.g. 5000"
                  value={weeklyAmount}
                  onChange={(e) => setWeeklyAmount(e.target.value)}
                  min="0"
                />
                {weeklyAmount && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-primary mt-3">
                    Annual: {formatCurrency(annualAmount)}
                  </motion.p>
                )}
                <GlassButton
                  variant="primary"
                  className="w-full mt-6 text-sm"
                  onClick={() => setStep("confirm")}
                  disabled={!weeklyAmount || Number(weeklyAmount) <= 0}
                >
                  Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-[13px] text-muted-foreground uppercase tracking-widest mb-2">Annual {label} Spend</p>
                <h2 className="font-display text-2xl font-bold gradient-text mb-4">{formatCurrency(annualAmount)}</h2>
                <p className="text-[13px] text-muted-foreground mb-6">
                  You'll need to verify this spend with transaction IDs to claim.
                </p>
                <GlassButton variant="primary" className="w-full text-sm" onClick={handleConfirm}>
                  Save & Activate
                </GlassButton>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default ActivateWalletModal;
