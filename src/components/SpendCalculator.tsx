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

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

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
    <section className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted/30"
            >
              <motion.div
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Wifi className="w-6 h-6 text-primary" />
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
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-primary/80 mt-4 font-bold"
                  >
                    Annual: {formatNaira(Number(weeklyData) * 52)}
                  </motion.p>
                )}
                <GlassButton
                  variant="primary"
                  className="w-full mt-6 py-4 clay-primary"
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Zap className="w-6 h-6 text-primary" />
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
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-primary/80 mt-4 font-bold"
                  >
                    Annual: {formatNaira(Number(monthlyElectricity) * 12)}
                  </motion.p>
                )}
                <GlassButton
                  variant="primary"
                  className="w-full mt-6 py-4 clay-primary"
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
              <GlassCard variant="glow" className="text-center p-8">
                <motion.p
                  className="text-sm text-muted-foreground font-display uppercase tracking-widest mb-2 font-semibold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Your Annual Spend
                </motion.p>
                <motion.h2
                  className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {formatNaira(totalAnnual)}
                </motion.h2>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="glass rounded-2xl p-4 border-white/5">
                    <Wifi className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-1">Data</p>
                    <p className="font-display font-bold text-foreground text-sm">{formatNaira(annualData)}</p>
                  </div>
                  <div className="glass rounded-2xl p-4 border-white/5">
                    <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-1">Electricity</p>
                    <p className="font-display font-bold text-foreground text-sm">{formatNaira(annualElectricity)}</p>
                  </div>
                </div>

                <motion.p
                  className="text-sm text-muted-foreground mb-8 leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  That's money you could put toward your goals. Let's help you reclaim it.
                </motion.p>

                <GlassButton variant="primary" className="w-full text-base py-5 clay-primary" onClick={handleComplete}>
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
