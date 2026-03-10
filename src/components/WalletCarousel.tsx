import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Wifi, UtensilsCrossed, Car } from "lucide-react";
import { cn } from "@/lib/utils";


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
  const { formatCurrency } = useCurrency();
  const [showTotal, setShowTotal] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [popupEmblaRef, popupEmblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupSelectedIndex, setPopupSelectedIndex] = useState(0);
  const [currentWalletActive, setCurrentWalletActive] = useState(true);
  const [showSpendPopup, setShowSpendPopup] = useState(false);

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

  const onPopupSelect = useCallback(() => {
    if (!popupEmblaApi) return;
    const idx = popupEmblaApi.selectedScrollSnap();
    setPopupSelectedIndex(idx);
  }, [popupEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!popupEmblaApi) return;
    onPopupSelect();
    popupEmblaApi.on("select", onPopupSelect);
    return () => { popupEmblaApi.off("select", onPopupSelect); };
  }, [popupEmblaApi, onPopupSelect]);

  // Sync popup carousel to main carousel when popup opens
  useEffect(() => {
    if (showSpendPopup && popupEmblaApi) {
      popupEmblaApi.scrollTo(selectedIndex, true);
      setPopupSelectedIndex(selectedIndex);
    }
  }, [showSpendPopup, popupEmblaApi, selectedIndex]);

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
                    <p className="text-muted-foreground uppercase tracking-widest-more text-[11px] font-bold">
                      {wallet.label}
                    </p>
                  </div>
                  {idx === 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</span>
                      <button
                        onClick={() => setShowTotal(!showTotal)}
                        className={cn(
                          "relative w-8 h-[18px] rounded-full transition-all duration-300 overflow-hidden",
                          "border border-border/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
                          showTotal
                            ? "bg-primary/20 border-primary/30"
                            : "bg-muted/50 dark:bg-muted/30"
                        )}
                      >
                        {/* Liquid flow background */}
                        <span
                          className={cn(
                            "absolute inset-0 rounded-full opacity-60 transition-opacity duration-300",
                            showTotal ? "opacity-80" : "opacity-40"
                          )}
                          style={{
                            background: showTotal
                              ? "linear-gradient(135deg, hsl(160 60% 40% / 0.5), hsl(160 45% 55% / 0.3))"
                              : "linear-gradient(135deg, hsl(160 50% 35% / 0.2), hsl(160 40% 50% / 0.1))",
                            animation: "waterFlow 4s ease-in-out infinite",
                          }}
                        />
                        {/* Thumb */}
                        <span
                          className={cn(
                            "absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-300",
                            "shadow-[0_1px_4px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.3)]",
                            "overflow-hidden",
                            showTotal ? "left-[14px]" : "left-[2px]"
                          )}
                          style={{
                            background: "linear-gradient(180deg, hsl(160 50% 45% / 0.9), hsl(160 60% 30% / 0.8))",
                            boxShadow: "0 1px 4px hsl(160 50% 25% / 0.3), inset 0 1px 2px hsl(160 40% 60% / 0.4), inset 0 -1px 2px hsl(160 60% 15% / 0.3)",
                          }}
                        >
                          {/* Liquid shimmer inside thumb */}
                          <span
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: "radial-gradient(circle at 40% 35%, hsl(160 50% 70% / 0.5) 0%, transparent 60%)",
                            }}
                          />
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {wallet.active ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <h2 className="font-display text-3xl font-bold gradient-text tabular-nums leading-none tracking-tight">
                        {formatCurrency(wallet.amount)}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5 font-medium">
                      Claimable: <span className="text-primary font-bold">{formatCurrency(nairaValue)}</span> <span className="opacity-60">({pointsBalance.toLocaleString()} pts)</span>
                    </p>

                    <button
                      onClick={() => setShowSpendPopup(true)}
                      className="w-full text-left space-y-2 mb-6 cursor-pointer group/goal"
                    >
                      <div className="flex justify-between items-end">
                        <p className="font-bold text-foreground text-xs group-hover/goal:text-primary transition-colors uppercase tracking-wide">GOAL - {goalLabel}</p>
                        <p className="text-muted-foreground text-xs font-bold">
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
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground text-sm mb-4 font-medium">
                      You haven't calculated your {wallet.type} spend yet.
                    </p>
                    <button
                      onClick={() => onActivateWallet(wallet.type as "food" | "transport")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors tracking-tight"
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

      {/* Spend popup rendered via portal to escape parent overflow/transform */}
      {createPortal(
        <AnimatePresence>
          {showSpendPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center"
              onClick={() => setShowSpendPopup(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

              {/* Circle card with carousel */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-[22rem] h-[22rem] sm:w-[26rem] sm:h-[26rem] rounded-full flex flex-col items-center justify-center glass-card border border-border/20 shadow-[0_8px_40px_hsl(var(--primary)/0.15)]"
              >
                {/* Carousel inside popup */}
                <div ref={popupEmblaRef} className="overflow-hidden w-[70%]">
                  <div className="flex">
                    {wallets.map((wallet) => (
                      <div key={wallet.type} className="min-w-0 shrink-0 grow-0 basis-full flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                          {wallet.icon}
                        </div>
                        <p className="text-muted-foreground uppercase tracking-widest-more text-[10px] font-bold mb-2 text-center">
                          {showTotal && wallet.type === "utility" ? "Total Annual Spend" : wallet.label}
                        </p>
                        <p className="font-display text-3xl font-bold gradient-text tabular-nums tracking-tight">
                          {formatCurrency(showTotal && wallet.type === "utility" ? totalAllSpend : wallet.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popup dots */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {wallets.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => popupEmblaApi?.scrollTo(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-200",
                        popupSelectedIndex === idx ? "bg-primary w-4" : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                {/* Total toggle */}
                <div className="flex items-center gap-1.5 mt-4">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</span>
                  <button
                    onClick={() => setShowTotal(!showTotal)}
                    className={cn(
                      "relative w-8 h-[18px] rounded-full transition-all duration-300 overflow-hidden",
                      "border border-border/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
                      showTotal
                        ? "bg-primary/20 border-primary/30"
                        : "bg-muted/50 dark:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full opacity-60 transition-opacity duration-300",
                        showTotal ? "opacity-80" : "opacity-40"
                      )}
                      style={{
                        background: showTotal
                          ? "linear-gradient(135deg, hsl(160 60% 40% / 0.5), hsl(160 45% 55% / 0.3))"
                          : "linear-gradient(135deg, hsl(160 50% 35% / 0.2), hsl(160 40% 50% / 0.1))",
                        animation: "waterFlow 4s ease-in-out infinite",
                      }}
                    />
                    <span
                      className={cn(
                        "absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-300",
                        "shadow-[0_1px_4px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.3)]",
                        "overflow-hidden",
                        showTotal ? "left-[14px]" : "left-[2px]"
                      )}
                      style={{
                        background: "linear-gradient(180deg, hsl(160 50% 45% / 0.9), hsl(160 60% 30% / 0.8))",
                        boxShadow: "0 1px 4px hsl(160 50% 25% / 0.3), inset 0 1px 2px hsl(160 40% 60% / 0.4), inset 0 -1px 2px hsl(160 60% 15% / 0.3)",
                      }}
                    >
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "radial-gradient(circle at 40% 35%, hsl(160 50% 70% / 0.5) 0%, transparent 60%)",
                        }}
                      />
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default WalletCarousel;
