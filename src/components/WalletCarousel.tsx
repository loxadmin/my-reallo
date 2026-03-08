import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { Switch } from "./ui/switch";
import { Wifi, Zap, UtensilsCrossed, Bus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

interface WalletCarouselProps {
  pointsBalance: number;
  nairaValue: number;
}

interface WalletDef {
  id: string;
  label: string;
  icon: any;
  spendKey: "total_annual_spend" | "annual_food_spend" | "annual_transport_spend";
  activatedCheck: (profile: any) => boolean;
  inputLabel: string;
  inputFreq: string;
  multiplier: number;
}

const wallets: WalletDef[] = [
  {
    id: "utility",
    label: "Annual Utility Spend",
    icon: Zap,
    spendKey: "total_annual_spend",
    activatedCheck: (p) => (p?.total_annual_spend ?? 0) > 0,
    inputLabel: "",
    inputFreq: "",
    multiplier: 1,
  },
  {
    id: "food",
    label: "Annual Food Spend",
    icon: UtensilsCrossed,
    spendKey: "annual_food_spend",
    activatedCheck: (p) => (p?.annual_food_spend ?? 0) > 0,
    inputLabel: "Weekly food spend",
    inputFreq: "weekly",
    multiplier: 52,
  },
  {
    id: "transport",
    label: "Annual Transport Spend",
    icon: Bus,
    spendKey: "annual_transport_spend",
    activatedCheck: (p) => (p?.annual_transport_spend ?? 0) > 0,
    inputLabel: "Weekly transport spend",
    inputFreq: "weekly",
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
    if (Math.abs(diff) > 50) {
      handleSwipe(diff > 0 ? "left" : "right");
    }
  };

  const handleActivate = async (wallet: WalletDef) => {
    if (!inputValue || !user) return;
    setSaving(true);
    const annual = Number(inputValue) * wallet.multiplier;
    const updateData: any = { [wallet.spendKey]: annual };

    // Also recalculate total_annual_spend
    const currentData = profile?.annual_data_spend ?? 0;
    const currentElec = profile?.annual_electricity_spend ?? 0;
    const currentFood = wallet.id === "food" ? annual : (profile?.annual_food_spend ?? 0);
    const currentTransport = wallet.id === "transport" ? annual : (profile?.annual_transport_spend ?? 0);
    updateData.total_annual_spend = currentData + currentElec + currentFood + currentTransport;

    await supabase.from("profiles").update(updateData).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setActivatingWallet(null);
    setInputValue("");
    toast({ title: `${wallet.label} activated!`, description: `Annual spend: ${formatNaira(annual)}` });
  };

  const currentWallet = wallets[activeIndex];
  const isActivated = currentWallet.activatedCheck(profile);
  const spendAmount = profile?.[currentWallet.spendKey as keyof typeof profile] as number ?? 0;

  const totalAllSpend = (profile?.total_annual_spend ?? 0);

  return (
    <div className="space-y-3">
      {/* Swipe area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWallet.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard variant="glow" className="relative overflow-hidden p-5">
              {/* Total toggle - only on utility wallet */}
              {activeIndex === 0 && (
                <div className="flex items-center justify-end gap-2 mb-2">
                  <span className="text-[10px] text-muted-foreground">Show Total</span>
                  <Switch
                    checked={showTotal}
                    onCheckedChange={setShowTotal}
                    className="scale-75"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <currentWallet.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-muted-foreground uppercase tracking-[0.12em] text-[10px] font-medium">
                  {showTotal && activeIndex === 0 ? "Total Annual Spend" : currentWallet.label}
                </p>
              </div>

              {isActivated ? (
                <>
                  <h2 className="font-display text-2xl font-bold gradient-text tabular-nums leading-none mb-1">
                    {formatNaira(showTotal && activeIndex === 0 ? totalAllSpend : spendAmount)}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Claimable: <span className="text-primary font-semibold">{formatNaira(nairaValue)}</span> ({pointsBalance.toLocaleString()} pts)
                  </p>
                </>
              ) : activatingWallet === currentWallet.id ? (
                <div className="space-y-3">
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
                    <GlassButton
                      variant="primary"
                      className="flex-1 text-[12px]"
                      onClick={() => handleActivate(currentWallet)}
                      disabled={!inputValue || saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </GlassButton>
                    <GlassButton
                      variant="outline"
                      className="text-[12px]"
                      onClick={() => { setActivatingWallet(null); setInputValue(""); }}
                    >
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-[12px] text-muted-foreground mb-3">
                    You haven't calculated your {currentWallet.label.toLowerCase()} yet.
                  </p>
                  <GlassButton
                    variant="primary"
                    className="text-[12px]"
                    onClick={() => setActivatingWallet(currentWallet.id)}
                  >
                    Activate
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {activeIndex > 0 && (
          <button
            onClick={() => handleSwipe("right")}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {activeIndex < wallets.length - 1 && (
          <button
            onClick={() => handleSwipe("left")}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {wallets.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIndex ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default WalletCarousel;
