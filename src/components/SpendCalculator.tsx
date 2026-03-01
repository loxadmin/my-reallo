import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ArrowRight, Zap, Wifi } from "lucide-react";

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
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
            >
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
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Data Spend</h2>
                    <p className="text-sm text-muted-foreground">How much per week?</p>
                  </div>
                </div>
                <GlassInput
                  label="Weekly data spend"
                  prefix="₦"
                  type="number"
                  placeholder="e.g. 5000"
                  value={weeklyData}
                  onChange={(e) => setWeeklyData(e.target.value)}
                  min="0"
                />
                {weeklyData && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-primary/70 mt-3 font-display"
                  >
                    Annual: {formatNaira(Number(weeklyData) * 52)}
                  </motion.p>
                )}
                <GlassButton
                  variant="primary"
                  className="w-full mt-6"
                  onClick={handleNext}
                  disabled={!weeklyData}
                >
                  Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <GlassCard variant="glow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Electricity Spend</h2>
                    <p className="text-sm text-muted-foreground">How much per month?</p>
                  </div>
                </div>
                <GlassInput
                  label="Monthly electricity spend"
                  prefix="₦"
                  type="number"
                  placeholder="e.g. 15000"
                  value={monthlyElectricity}
                  onChange={(e) => setMonthlyElectricity(e.target.value)}
                  min="0"
                />
                {monthlyElectricity && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-primary/70 mt-3 font-display"
                  >
                    Annual: {formatNaira(Number(monthlyElectricity) * 12)}
                  </motion.p>
                )}
                <GlassButton
                  variant="primary"
                  className="w-full mt-6"
                  onClick={handleNext}
                  disabled={!monthlyElectricity}
                >
                  See My Total <ArrowRight className="inline w-4 h-4 ml-2" />
                </GlassButton>
              </GlassCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard variant="glow" className="text-center">
                <motion.p
                  className="text-sm text-muted-foreground font-display uppercase tracking-widest mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Your Annual Spend
                </motion.p>
                <motion.h2
                  className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {formatNaira(totalAnnual)}
                </motion.h2>

                <div className="flex gap-4 mb-8">
                  <div className="flex-1 glass rounded-xl p-4">
                    <Wifi className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-display font-semibold text-foreground">{formatNaira(annualData)}</p>
                  </div>
                  <div className="flex-1 glass rounded-xl p-4">
                    <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Electricity</p>
                    <p className="font-display font-semibold text-foreground">{formatNaira(annualElectricity)}</p>
                  </div>
                </div>

                <motion.p
                  className="text-sm text-muted-foreground mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  That's money you could put toward your goals. Let's help you reclaim it.
                </motion.p>

                <GlassButton variant="primary" className="w-full text-base py-4" onClick={handleComplete}>
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
