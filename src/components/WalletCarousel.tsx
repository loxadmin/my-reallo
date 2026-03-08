import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { Switch } from "./ui/switch";
import { Wallet, UtensilsCrossed, Bus, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

interface WalletCarouselProps {
  pointsBalance: number;
  nairaValue: number;
}

interface WalletDef {
  id: string;
  label: string;
  sublabel: string;
  icon: any;
  spendKey: "total_annual_spend" | "annual_food_spend" | "annual_transport_spend";
  activatedCheck: (profile: any) => boolean;
  inputLabel: string;
  multiplier: number;
}

const wallets: WalletDef[] = [
  {
    id: "utility",
    label: "ANNUAL UTILITY SPEND",
    sublabel: "Data + Electricity",
    icon: Wallet,
    spendKey: "total_annual_spend",
    activatedCheck: (p) => (p?.total_annual_spend ?? 0) > 0,
    inputLabel: "",
    multiplier: 1,
  },
  {
    id: "food",
    label: "ANNUAL FOOD SPEND",
    sublabel: "Weekly × 52",
    icon: UtensilsCrossed,
    spendKey: "annual_food_spend",
    activatedCheck: (p) => (p?.annual_food_spend ?? 0) > 0,
    inputLabel: "Weekly food spend",
    multiplier: 52,
  },
  {
    id: "transport",
    label: "ANNUAL TRANSPORT SPEND",
    sublabel: "Weekly × 52",
    icon: Bus,
    spendKey: "annual_transport_spend",
    activatedCheck: (p) => (p?.annual_transport_spend ?? 0) > 0,
    inputLabel: "Weekly transport spend",
    multiplier: 52,
  },
];

const WalletCarousel = ({ pointsBalance, nairaValue }: WalletCarouselProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTotal, setShowTotal] = useState(false);
  const [activatingWallet, setActivatingWallet] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const touchStartX = useRef(0);

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left" && activeIndex < wallets.length - 1) setActiveIndex(activeIndex + 1);
    if (direction === "right" && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) handleSwipe(diff > 0 ? "left" : "right");
  };

  const handleActivate = async (wallet: WalletDef) => {
    if (!inputValue || !user) return;
    setSaving(true);
    const annual = Number(inputValue) * wallet.multiplier;
    const updateData: any = { [wallet.spendKey]: annual };
    await supabase.from("profiles").update(updateData).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setActivatingWallet(null);
    setInputValue("");
    toast({ title: `${wallet.label} activated!`, description: `Annual spend: ${formatNaira(annual)}` });
  };

  const currentWallet = wallets[activeIndex];
  const isActivated = currentWallet.activatedCheck(profile);
  const spendAmount = (profile as any)?.[currentWallet.spendKey] ?? 0;

  const totalAllSpend =
    ((profile as any)?.total_annual_spend ?? 0) +
    ((profile as any)?.annual_food_spend ?? 0) +
    ((profile as any)?.annual_transport_spend ?? 0);

  return (
    <div className="space-y-3">
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWallet.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard variant="glow">
              {/* Original wallet card design */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <currentWallet.icon className="w-4 h-4 text-primary" />
                  <p className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">
                    {showTotal && activeIndex === 0 ? "TOTAL ANNUAL SPEND" : currentWallet.label}
                  </p>
                </div>
                {/* Total toggle - only on utility wallet */}
                {activeIndex === 0 && isActivated && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground">Total</span>
                    <Switch checked={showTotal} onCheckedChange={setShowTotal} className="scale-[0.6]" />
                  </div>
                )}
              </div>

              {isActivated ? (
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold gradient-text">
                    {formatNaira(showTotal && activeIndex === 0 ? totalAllSpend : spendAmount)}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    = {pointsBalance.toLocaleString()} points ({formatNaira(nairaValue)} value)
                  </p>
                </div>
              ) : activatingWallet === currentWallet.id ? (
                <div className="space-y-3 mt-2">
                  <GlassInput
                    label={currentWallet.inputLabel}
                    prefix="₦"
                    type="number"
                    placeholder="e.g. 10000"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    min="0"
                  />
                  {inputValue && (
                    <p className="text-[11px] text-primary">
                      Annual: {formatNaira(Number(inputValue) * currentWallet.multiplier)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <GlassButton variant="primary" className="flex-1 text-[12px]" onClick={() => handleActivate(currentWallet)} disabled={!inputValue || saving}>
                      {saving ? "Saving..." : "Save"}
                    </GlassButton>
                    <GlassButton variant="outline" className="text-[12px]" onClick={() => { setActivatingWallet(null); setInputValue(""); }}>
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Sparkles className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground mb-3">
                    You haven't calculated your {currentWallet.label.toLowerCase()} yet.
                  </p>
                  <GlassButton variant="primary" className="text-[12px]" onClick={() => setActivatingWallet(currentWallet.id)}>
                    Activate
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {wallets.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIndex ? "bg-primary w-4" : "bg-muted-foreground/30"}`} />
        ))}
      </div>
    </div>
  );
};

export default WalletCarousel;
