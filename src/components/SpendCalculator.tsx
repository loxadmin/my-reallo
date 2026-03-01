import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ArrowRight, Zap, Wifi, ChevronLeft } from "lucide-react";

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

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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
    <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="flex items-center gap-4 mb-10">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="p-2 glass-button rounded-xl text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={false}
                  animate={{ width: step >= i ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Internet Data</h2>
              <p className="text-muted-foreground mb-8">How much do you spend on data weekly?</p>

              <GlassCard className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Wifi className="w-7 h-7 text-primary" />
                </div>

                <GlassInput
                  label="Weekly Data Spend"
                  prefix="₦"
                  type="number"
                  placeholder="5000"
                  value={weeklyData}
                  onChange={(e) => setWeeklyData(e.target.value)}
                />

                {weeklyData && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estimated Annual</p>
                    <p className="text-xl font-bold text-primary">{formatNaira(annualData)}</p>
                  </div>
                )}

                <GlassButton
                  variant="primary"
                  className="w-full mt-8 py-4 shadow-xl"
                  onClick={handleNext}
                  disabled={!weeklyData}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">Electricity</h2>
              <p className="text-muted-foreground mb-8">What's your average monthly power bill?</p>

              <GlassCard className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-primary" />
                </div>

                <GlassInput
                  label="Monthly Electricity"
                  prefix="₦"
                  type="number"
                  placeholder="15000"
                  value={monthlyElectricity}
                  onChange={(e) => setMonthlyElectricity(e.target.value)}
                />

                {monthlyElectricity && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estimated Annual</p>
                    <p className="text-xl font-bold text-primary">{formatNaira(annualElectricity)}</p>
                  </div>
                )}

                <GlassButton
                  variant="primary"
                  className="w-full mt-8 py-4 shadow-xl"
                  onClick={handleNext}
                  disabled={!monthlyElectricity}
                >
                  Calculate Total <ArrowRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mb-10">
                <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">Calculation Complete</p>
                <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">The Verdict</h2>
                <p className="text-muted-foreground max-w-xs mx-auto">Here is how much you're losing to utilities every single year.</p>
              </div>

              <GlassCard variant="blue" className="mb-8 p-10 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <p className="text-white/70 text-sm font-medium mb-2">Total Annual Spend</p>
                <h3 className="text-5xl font-bold text-white mb-8 tracking-tight">{formatNaira(totalAnnual)}</h3>

                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-8">
                  <div className="text-left">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Data</p>
                    <p className="text-lg font-bold text-white">{formatNaira(annualData)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Power</p>
                    <p className="text-lg font-bold text-white">{formatNaira(annualElectricity)}</p>
                  </div>
                </div>
              </GlassCard>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed px-4">
                  That's significant capital. Let's help you reclaim it and put it toward a life goal.
                </p>
                <GlassButton variant="primary" className="w-full py-5 text-lg shadow-2xl" onClick={handleComplete}>
                  Select My Reclaim Goal
                </GlassButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SpendCalculator;
