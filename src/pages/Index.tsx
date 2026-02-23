import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SpendCalculator from "@/components/SpendCalculator";
import GoalSelector from "@/components/GoalSelector";
import QueueDisplay from "@/components/QueueDisplay";

type AppStep = "hero" | "calculator" | "goal" | "queue";

interface SpendResult {
  weeklyData: number;
  monthlyElectricity: number;
  annualData: number;
  annualElectricity: number;
  totalAnnual: number;
}

const Index = () => {
  const [step, setStep] = useState<AppStep>("hero");
  const [spendResult, setSpendResult] = useState<SpendResult | null>(null);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [targetAmount, setTargetAmount] = useState(0);

  const handleSpendComplete = (result: SpendResult) => {
    setSpendResult(result);
    setStep("goal");
  };

  const handleGoalSelect = (goal: string, target: number) => {
    setSelectedGoal(goal);
    setTargetAmount(target);
    setStep("queue");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <Navbar />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === "hero" && <HeroSection onGetStarted={() => setStep("calculator")} />}
          {step === "calculator" && <SpendCalculator onComplete={handleSpendComplete} />}
          {step === "goal" && spendResult && (
            <GoalSelector totalAnnualSpend={spendResult.totalAnnual} onSelect={handleGoalSelect} />
          )}
          {step === "queue" && spendResult && (
            <QueueDisplay
              totalAnnualSpend={spendResult.totalAnnual}
              goal={selectedGoal}
              targetAmount={targetAmount}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
