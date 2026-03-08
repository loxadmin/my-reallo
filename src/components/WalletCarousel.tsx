import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Wifi, UtensilsCrossed, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export type WalletType = "utility" | "food" | "transport";

interface WalletCarouselProps {
  targetAmount: number;
  nairaValue: number;
  pointsBalance: number;
  goal: string;
  goalLabel: string;
  onActivateWallet: (type: "food" | "transport") => void;
  onActiveWalletChange?: (isActive: boolean) => void;
  onWalletContext?: (ctx: { walletType: WalletType; showTotal: boolean }) => void;
  children?: React.ReactNode;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG"); // fallback only

const WalletCarousel = ({
  targetAmount,
  nairaValue,
  pointsBalance,
  goal,
  goalLabel,
  onActivateWallet,
  onActiveWalletChange,
  onWalletContext,
  children,
}: WalletCarouselProps) => {
  const { profile } = useAuth();
  const [showTotal, setShowTotal] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentWalletActive, setCurrentWalletActive] = useState(true);

  const utilitySpend = (profile?.annual_data_spend ?? 0) + (profile?.annual_electricity_spend ?? 0);
  const foodSpend = profile?.annual_food_spend ?? 0;
  const transportSpend = profile?.annual_transport_spend ?? 0;
  const totalAllSpend = utilitySpend + foodSpend + transportSpend;

  const foodActive = foodSpend > 0;
  const transportActive = transportSpend > 0;

  const utilityDisplayAmount = showTotal ? totalAllSpend : utilitySpend;
  const utilityDisplayLabel = showTotal ? "Total Annual Spend" : "Annual Utility Spend";

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelectedIndex(idx);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const wallets: { type: WalletType; label: string; amount: number; icon: React.ReactNode; active: boolean }[] = [
    { type: "utility", label: utilityDisplayLabel, amount: utilityDisplayAmount, icon: <Wifi className="w-3.5 h-3.5" />, active: true },
    { type: "food", label: "Annual Food Spend", amount: foodSpend, icon: <UtensilsCrossed className="w-3.5 h-3.5" />, active: foodActive },
    { type: "transport", label: "Annual Transport Spend", amount: transportSpend, icon: <Car className="w-3.5 h-3.5" />, active: transportActive },
  ];

  const isCurrentActive = wallets[selectedIndex]?.active ?? true;
  const currentWalletType = wallets[selectedIndex]?.type ?? "utility";

  useEffect(() => {
    setCurrentWalletActive(isCurrentActive);
    onActiveWalletChange?.(isCurrentActive);
  }, [selectedIndex, isCurrentActive, onActiveWalletChange]);

  useEffect(() => {
    onWalletContext?.({ walletType: currentWalletType, showTotal });
  }, [currentWalletType, showTotal, onWalletContext]);

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {wallets.map((wallet, idx) => (
            <div key={wallet.type} className="min-w-0 shrink-0 grow-0 basis-full">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      {wallet.icon}
                    </div>
                    <p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px] font-medium">
                      {wallet.label}
                    </p>
                  </div>
                  {idx === 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground">Total</span>
                      <Switch
                        checked={showTotal}
                        onCheckedChange={setShowTotal}
                        className="h-4 w-7 data-[state=checked]:bg-primary"
                      />
                    </div>
                  )}
                </div>

                {wallet.active ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-1">
                      <h2 className="font-display text-2xl font-bold gradient-text tabular-nums leading-none">
                        {formatCurrency(wallet.amount)}
                      </h2>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      Claimable: <span className="text-primary font-semibold">{formatCurrency(nairaValue)}</span> ({pointsBalance.toLocaleString()} pts)
                    </p>

                    <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between items-end">
                        <p className="font-medium text-foreground text-[12px]">GOAL - {goalLabel}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {targetAmount > 0 ? Math.round((nairaValue / targetAmount) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${targetAmount > 0 ? Math.min((nairaValue / targetAmount) * 100, 100) : 0}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground text-[12px] mb-3">
                      You haven't calculated your {wallet.type} spend yet.
                    </p>
                    <button
                      onClick={() => onActivateWallet(wallet.type as "food" | "transport")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
                    >
                      Activate
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {wallets.map((_, idx) => (
          <button
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-200",
              selectedIndex === idx ? "bg-primary w-4" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {currentWalletActive && children}
    </div>
  );
};

export default WalletCarousel;
