import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { GraduationCap, Plane, Briefcase, Home } from "lucide-react";

interface GoalSelectorProps {
  totalAnnualSpend: number;
  onSelect: (goal: string, target: number) => void;
}

const goals = [
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    range: [10_000_000, 25_000_000],
    description: "Fund your academic journey",
  },
  {
    id: "vacation",
    label: "Vacation",
    icon: Plane,
    range: [3_000_000, 6_000_000],
    description: "Take your dream trip",
  },
  {
    id: "business",
    label: "Business Funding",
    icon: Briefcase,
    range: [2_000_000, 15_000_000],
    description: "Start or grow your business",
  },
  {
    id: "rent",
    label: "Rent Support",
    icon: Home,
    range: [500_000, 3_000_000],
    description: "Secure your living space",
  },
];

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const GoalSelector = ({ totalAnnualSpend, onSelect }: GoalSelectorProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState<number>(0);

  const selectedGoal = goals.find((g) => g.id === selected);
  const progress = selectedGoal && targetAmount > 0 ? Math.min((totalAnnualSpend / targetAmount) * 100, 100) : 0;

  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Choose Your Goal</h2>
          <p className="text-sm text-muted-foreground">
            Where should your {formatNaira(totalAnnualSpend)} go?
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {goals.map((goal, i) => {
            const Icon = goal.icon;
            const isSelected = selected === goal.id;
            return (
              <motion.button
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  setSelected(goal.id);
                  setTargetAmount(goal.range[0]);
                }}
                className={`glass-card rounded-2xl p-4 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-primary/40 shadow-[0_0_30px_hsl(48_96%_53%/0.15)]"
                    : "hover:border-primary/20"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected ? "bg-primary/20" : "bg-muted"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className="font-display font-semibold text-sm text-foreground">{goal.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
              </motion.button>
            );
          })}
        </div>

        {selectedGoal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard variant="glow">
              <p className="text-sm text-muted-foreground mb-3 font-display">Set your target amount</p>
              <input
                type="range"
                min={selectedGoal.range[0]}
                max={selectedGoal.range[1]}
                step={100_000}
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full accent-primary h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_15px_hsl(48_96%_53%/0.5)]"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2 font-display">
                <span>{formatNaira(selectedGoal.range[0])}</span>
                <span>{formatNaira(selectedGoal.range[1])}</span>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-display text-2xl font-bold gradient-text">{formatNaira(targetAmount)}</p>

                {/* Progress */}
                <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Annual contribution: {formatNaira(totalAnnualSpend)} ({progress.toFixed(1)}%)
                </p>
                <p className="text-xs text-primary/60 mt-1">
                  Multi-year reclaim increases your goal progress.
                </p>
              </div>

              <GlassButton
                variant="primary"
                className="w-full mt-6 text-base py-4"
                onClick={() => onSelect(selectedGoal.id, targetAmount)}
              >
                Claim Now
              </GlassButton>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default GoalSelector;
