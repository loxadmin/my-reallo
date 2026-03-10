import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ArrowRight, Zap, Wifi, UtensilsCrossed, Car } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  weeklyFood: number;
  weeklyTransport: number;
  annualData: number;
  annualElectricity: number;
  annualFood: number;
  annualTransport: number;
  totalAnnual: number;
}

interface SpendCalculatorProps {
  onComplete: (result: SpendResult) => void;
}

const SpendCalculator = ({ onComplete }: SpendCalculatorProps) => {
  const { formatCurrency, currency } = useCurrency();
  const [step, setStep] = useState(0);
  const [weeklyData, setWeeklyData] = useState("");
  const [monthlyElectricity, setMonthlyElectricity] = useState("");
  const [weeklyFood, setWeeklyFood] = useState("");
  const [weeklyTransport, setWeeklyTransport] = useState("");

  const annualData = Number(weeklyData) * 52;
  const annualElectricity = Number(monthlyElectricity) * 12;
  const annualFood = Number(weeklyFood) * 52;
  const annualTransport = Number(weeklyTransport) * 52;
  const totalAnnual = annualData + annualElectricity + annualFood + annualTransport;

  const totalSteps = 5; // 0=data, 1=electricity, 2=food, 3=transport, 4=summary

  const handleNext = () => {
    if (step === 0 && weeklyData) setStep(1);
    else if (step === 1 && monthlyElectricity) setStep(2);
    else if (step === 2 && weeklyFood) setStep(3);
    else if (step === 3 && weeklyTransport) setStep(4);
  };

  const handleComplete = () => {
    onComplete({
      weeklyData: Number(weeklyData),
      monthlyElectricity: Number(monthlyElectricity),
      weeklyFood: Number(weeklyFood),
      weeklyTransport: Number(weeklyTransport),
      annualData,
      annualElectricity,
      annualFood,
      annualTransport,
      totalAnnual,
    });
  };

  const sym = currency.symbol;

  return (
    <section className="min-h-screen flex items-start justify-center px-4 sm:px-6 pt-4 pb-20">
      <div className="w-full max-w-md">
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-muted">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: step >= i ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold text-foreground">Data Spend</h2>
                    <p className="text-[12px] text-muted-foreground">How much per week?</p>
                  </div>
                </div>
                <GlassInput label="Weekly data spend" prefix={sym} type="number" placeholder="e.g. 5000" value={weeklyData} onChange={(e) => setWeeklyData(e.target.value)} min="0" />
                {weeklyData && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-primary mt-3">
                    Annual: {formatCurrency(annualData)}
                  </motion.p>
                )}
                <GlassButton variant="primary" className="w-full mt-6 text-[13px]" onClick={handleNext} disabled={!weeklyData}>
                  Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold text-foreground">Electricity Spend</h2>
                    <p className="text-[12px] text-muted-foreground">How much per month?</p>
                  </div>
                </div>
                <GlassInput label="Monthly electricity spend" prefix={sym} type="number" placeholder="e.g. 15000" value={monthlyElectricity} onChange={(e) => setMonthlyElectricity(e.target.value)} min="0" />
                {monthlyElectricity && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-primary mt-3">
                    Annual: {formatCurrency(annualElectricity)}
                  </motion.p>
                )}
                <GlassButton variant="primary" className="w-full mt-6 text-[13px]" onClick={handleNext} disabled={!monthlyElectricity}>
                  Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold text-foreground">Food Spend</h2>
                    <p className="text-[12px] text-muted-foreground">How much per week?</p>
                  </div>
                </div>
                <GlassInput label="Weekly food spend" prefix={sym} type="number" placeholder="e.g. 7000" value={weeklyFood} onChange={(e) => setWeeklyFood(e.target.value)} min="0" />
                {weeklyFood && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-primary mt-3">
                    Annual: {formatCurrency(annualFood)}
                  </motion.p>
                )}
                <GlassButton variant="primary" className="w-full mt-6 text-[13px]" onClick={handleNext} disabled={!weeklyFood}>
                  Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold text-foreground">Transport Spend</h2>
                    <p className="text-[12px] text-muted-foreground">How much per week?</p>
                  </div>
                </div>
                <GlassInput label="Weekly transport spend" prefix={sym} type="number" placeholder="e.g. 3000" value={weeklyTransport} onChange={(e) => setWeeklyTransport(e.target.value)} min="0" />
                {weeklyTransport && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-primary mt-3">
                    Annual: {formatCurrency(annualTransport)}
                  </motion.p>
                )}
                <GlassButton variant="primary" className="w-full mt-6 text-[13px]" onClick={handleNext} disabled={!weeklyTransport}>
                  See My Total <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <GlassCard variant="glow" className="text-center">
                <motion.p className="text-[12px] text-muted-foreground uppercase tracking-widest mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  Your Total Annual Spend
                </motion.p>
                <motion.h2 className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  {formatCurrency(totalAnnual)}
                </motion.h2>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="glass rounded-xl p-3">
                    <Wifi className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Data</p>
                    <p className="text-[12px] font-semibold text-foreground">{formatCurrency(annualData)}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Electricity</p>
                    <p className="text-[12px] font-semibold text-foreground">{formatCurrency(annualElectricity)}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <UtensilsCrossed className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Food</p>
                    <p className="text-[12px] font-semibold text-foreground">{formatCurrency(annualFood)}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <Car className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Transport</p>
                    <p className="text-[12px] font-semibold text-foreground">{formatCurrency(annualTransport)}</p>
                  </div>
                </div>
                <motion.p className="text-[12px] text-muted-foreground mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  That's money you could put toward your goals. Let's help you reclaim it.
                </motion.p>
                <GlassButton variant="primary" className="w-full text-[13px] py-3.5" onClick={handleComplete}>
                  Choose My Goal
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SpendCalculator;
