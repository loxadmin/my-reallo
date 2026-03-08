import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassInput from "./GlassInput";
import GlassButton from "./GlassButton";
import { UtensilsCrossed, Car, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

interface ActivateSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spendType: "food" | "transport";
}

const ActivateSpendDialog = ({ open, onOpenChange, spendType }: ActivateSpendDialogProps) => {
  const { user, refreshProfile } = useAuth();
  const [weeklySpend, setWeeklySpend] = useState("");
  const [saving, setSaving] = useState(false);

  const annualSpend = Number(weeklySpend) * 52;
  const label = spendType === "food" ? "Food" : "Transport";
  const Icon = spendType === "food" ? UtensilsCrossed : Car;

  const handleSave = async () => {
    if (!user || !weeklySpend) return;
    setSaving(true);

    const field = spendType === "food" ? "annual_food_spend" : "annual_transport_spend";

    // Also update total_annual_spend
    const { data: profileData } = await supabase
      .from("profiles")
      .select("annual_data_spend, annual_electricity_spend, annual_food_spend, annual_transport_spend")
      .eq("id", user.id)
      .single();

    const current = profileData || { annual_data_spend: 0, annual_electricity_spend: 0, annual_food_spend: 0, annual_transport_spend: 0 };
    const newTotal =
      (current.annual_data_spend ?? 0) +
      (current.annual_electricity_spend ?? 0) +
      (spendType === "food" ? annualSpend : (current.annual_food_spend ?? 0)) +
      (spendType === "transport" ? annualSpend : (current.annual_transport_spend ?? 0));

    await supabase.from("profiles").update({
      [field]: annualSpend,
      total_annual_spend: newTotal,
    }).eq("id", user.id);

    await refreshProfile();
    setSaving(false);
    setWeeklySpend("");
    onOpenChange(false);
    toast({ title: `${label} Spend Activated`, description: `Annual ${label.toLowerCase()} spend: ${formatNaira(annualSpend)}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            {label} Spend
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <GlassInput
            label={`Weekly ${label.toLowerCase()} spend`}
            prefix="₦"
            type="number"
            placeholder="e.g. 5000"
            value={weeklySpend}
            onChange={(e) => setWeeklySpend(e.target.value)}
            min="0"
          />
          {weeklySpend && (
            <p className="text-[12px] text-primary">
              Annual: {formatNaira(annualSpend)}
            </p>
          )}
          <GlassButton
            variant="primary"
            className="w-full text-[12px]"
            onClick={handleSave}
            disabled={!weeklySpend || saving}
          >
            {saving ? "Saving..." : <>Activate <ArrowRight className="inline w-3.5 h-3.5 ml-1" /></>}
          </GlassButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivateSpendDialog;
