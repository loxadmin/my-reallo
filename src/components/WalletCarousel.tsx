import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@/contexts/AuthContext";
import { Wifi, Zap, UtensilsCrossed, Car, ChevronLeft, ChevronRight } from "lucide-react";
import GlassCard from "./GlassCard";
import { Switch } from "./ui/switch";
import ActivateSpendDialog from "./ActivateSpendDialog";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

interface WalletCarouselProps {
  pointsBalance: number;
  nairaValue: number;
}

interface WalletData {
  id: string;
  label: string;
  icon: React.ReactNode;
  annualSpend: number;
  isActivated: boolean;
  activateType?: "food" | "transport";
}

const WalletCarousel = ({ pointsBalance, nairaValue }: WalletCarouselProps) => {
  const { profile } = useAuth();
  const [showTotal, setShowTotal] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateType, setActivateType] = useState<"food" | "transport">("food");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const utilitySpend = (profile?.annual_data_spend ?? 0) + (profile?.annual_electricity_spend ?? 0);
  const foodSpend = profile?.annual_food_spend ?? 0;
  const transportSpend = profile?.annual_transport_spend ?? 0;
  const totalAnnualSpend = utilitySpend + foodSpend + transportSpend;

  const wallets: WalletData[] = [
    {
      id: "utility",
      label: "Annual Utility Spend",
      icon: <><Wifi className="w-3.5 h-3.5" /><Zap className="w-3.5 h-3.5" /></>,
      annualSpend: utilitySpend,
      isActivated: utilitySpend > 0,
    },
    {
      id: "food",
      label: "Annual Food Spend",
      icon: <UtensilsCrossed className="w-4 h-4" />,
      annualSpend: foodSpend,
      isActivated: foodSpend > 0,
      activateType: "food",
    },
    {
      id: "transport",
      label: "Annual Transport Spend",
      icon: <Car className="w-4 h-4" />,
      annualSpend: transportSpend,
      isActivated: transportSpend > 0,
      activateType: "transport",
    },
  ];

  const handleActivate = (type: "food" | "transport") => {
    setActivateType(type);
    setActivateOpen(true);
  };

  return (
    <>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="flex-[0_0_100%] min-w-0">
                <GlassCard variant="glow" className="relative overflow-hidden p-5" animate={false}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-primary">
                      {wallet.icon}
                    </div>
                    {wallet.id === "utility" && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</span>
                        <Switch
                          checked={showTotal}
                          onCheckedChange={setShowTotal}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-muted-foreground uppercase tracking-[0.15em] text-[10px] font-medium mb-1">
                    {wallet.id === "utility" && showTotal ? "Total Annual Spend" : wallet.label}
                  </p>

                  {wallet.isActivated ? (
                    <>
                      <div className="flex items-baseline gap-3 mb-1">
                        <h2 className="font-display text-2xl font-bold gradient-text tabular-nums leading-none">
                          {formatNaira(wallet.id === "utility" && showTotal ? totalAnnualSpend : wallet.annualSpend)}
                        </h2>
                      </div>
                      {wallet.id === "utility" && showTotal && (
                        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Utility: {formatNaira(utilitySpend)}</span>
                          {foodSpend > 0 && <span>Food: {formatNaira(foodSpend)}</span>}
                          {transportSpend > 0 && <span>Transport: {formatNaira(transportSpend)}</span>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-4">
                      <p className="text-[12px] text-muted-foreground mb-3">
                        Calculate your annual {wallet.id} spend to activate this wallet.
                      </p>
                      <button
                        onClick={() => handleActivate(wallet.activateType!)}
                        className="clay-primary rounded-xl px-5 py-2.5 text-[12px] font-medium"
                      >
                        Activate
                      </button>
                    </div>
                  )}
                </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {wallets.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                selectedIndex === i ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      <ActivateSpendDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        spendType={activateType}
      />
    </>
  );
};

export default WalletCarousel;
