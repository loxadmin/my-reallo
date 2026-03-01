import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ArrowRight, Zap, Wifi, Calculator, ChevronRight } from "lucide-react";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

interface SpendCalculatorProps {
  onComplete: (result: SpendResult) => void;
}

const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG");

const SpendCalculator = ({ onComplete }: SpendCalculatorProps) => {
  const [step, setStep] = useState(0);
  const [weeklyData, setWeeklyData] = useState("");
  const [monthlyElectricity, setMonthlyElectricity] = useState("");

  const annualData = Number(weeklyData) * 52;
  const annualElectricity = Number(monthlyElectricity) * 12;
  const totalAnnual = annualData + annualElectricity;

  const handleNext = () => {
    if (step === 0 && weeklyData) setStep(1);
    else if (step === 1 && monthlyElectricity) setStep(2);
  };

  const handleComplete = () => {
    onComplete({
      weeklyData: Number(weeklyData),
      monthlyElectricity: Number(monthlyElectricity),
      annualData,
      annualElectricity,
      totalAnnual,
    });
  };

  return (
    <section className="flex flex-col items-center justify-center py-10">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl glass border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Spend Calculator</h1>
          <p className="text-sm text-muted-foreground font-medium">Let's see how much you can reclaim</p>
        </div>

        {/* Progress */}
        <div className="flex gap-3 px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden"
            >
              <motion.div
                className="h-full bg-primary shadow-[0_0_10px_hsla(var(--primary)/0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: step >= i ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-2"
            >
              <GlassCard variant="glow" className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Wifi className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Data Expenses</h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Weekly Average</p>
                  </div>
                </div>

                <GlassInput
                  label="Average weekly data spend"
                  type="number"
                  placeholder="e.g. 5,000"
                  value={weeklyData}
                  onChange={(e) => setWeeklyData(e.target.value)}
                  min="0"
                  icon={<span className="font-display font-bold text-primary/60">₦</span>}
                />

                <div className="space-y-4">
                  {weeklyData && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-display font-bold uppercase tracking-wider">Estimated Annual</span>
                      <span className="font-display font-bold text-primary text-lg">{formatNaira(Number(weeklyData) * 52)}</span>
                    </div>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={!weeklyData}
                    className="clay-primary w-full py-5 rounded-2xl flex items-center justify-center gap-2 group text-base"
                  >
                    Continue to Electricity
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-2"
            >
              <GlassCard variant="glow" className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Electricity Bill</h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Monthly Average</p>
                  </div>
                </div>

                <GlassInput
                  label="Average monthly electricity bill"
                  type="number"
                  placeholder="e.g. 15,000"
                  value={monthlyElectricity}
                  onChange={(e) => setMonthlyElectricity(e.target.value)}
                  min="0"
                  icon={<span className="font-display font-bold text-primary/60">₦</span>}
                />

                <div className="space-y-4">
                  {monthlyElectricity && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-display font-bold uppercase tracking-wider">Estimated Annual</span>
                      <span className="font-display font-bold text-primary text-lg">{formatNaira(Number(monthlyElectricity) * 12)}</span>
                    </div>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={!monthlyElectricity}
                    className="clay-primary w-full py-5 rounded-2xl flex items-center justify-center gap-2 group text-base"
                  >
                    Calculate My Reclaim
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2"
            >
              <GlassCard variant="glow" className="text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Calculator size={160} />
                </div>

                <div className="space-y-2 relative z-10">
                  <p className="text-xs text-muted-foreground font-display font-bold uppercase tracking-[0.2em]">Total Reclaimable Spend</p>
                  <motion.h2
                    className="font-display text-5xl font-bold gradient-text tracking-tighter"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {formatNaira(totalAnnual)}
                  </motion.h2>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="glass rounded-2xl p-4 space-y-1">
                    <Wifi className="w-5 h-5 text-primary mx-auto opacity-60" />
                    <p className="text-[10px] text-muted-foreground font-display font-bold uppercase">Annual Data</p>
                    <p className="font-display font-bold text-foreground">{formatNaira(annualData)}</p>
                  </div>
                  <div className="glass rounded-2xl p-4 space-y-1">
                    <Zap className="w-5 h-5 text-primary mx-auto opacity-60" />
                    <p className="text-[10px] text-muted-foreground font-display font-bold uppercase">Annual Power</p>
                    <p className="font-display font-bold text-foreground">{formatNaira(annualElectricity)}</p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10 pt-4">
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    That's money you're guaranteed to spend every year. Let's help you put it toward something meaningful.
                  </p>
                  <button
                    className="clay-primary w-full py-5 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 group"
                    onClick={handleComplete}
                  >
                    Choose My Goal
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SpendCalculator;
