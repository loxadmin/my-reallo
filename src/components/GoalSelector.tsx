import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { GraduationCap, Plane, Briefcase, Home, ChevronRight, ArrowLeft } from "lucide-react";

interface GoalSelectorProps {
  totalAnnualSpend: number;
  onSelect: (goal: string, target: number) => void;
}

interface GoalCategory {
  id: string;
  goal_type: string;
  subcategory: string | null;
  label: string;
  max_price: number;
}

const goalMeta: Record<string, { label: string; icon: any; description: string }> = {
  education: { label: "Education", icon: GraduationCap, description: "Fund your academic journey" },
  vacation: { label: "Vacation", icon: Plane, description: "Take your dream trip" },
  business: { label: "Business Funding", icon: Briefcase, description: "Start or grow your business" },
  rent: { label: "Rent Support", icon: Home, description: "Secure your living space" },
};

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const GoalSelector = ({ totalAnnualSpend, onSelect }: GoalSelectorProps) => {
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("goal_categories")
        .select("*")
        .order("goal_type");
      setCategories((data as GoalCategory[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const goalTypes = [...new Set(categories.map((c) => c.goal_type))];
  const subcategories = categories.filter((c) => c.goal_type === selectedType);
  const hasSubcategories = subcategories.length > 1 || subcategories.some((c) => c.subcategory);

  const claimableAmount = selectedCategory
    ? Math.min(totalAnnualSpend, selectedCategory.max_price)
    : 0;

  const progress = selectedCategory
    ? (claimableAmount / selectedCategory.max_price) * 100
    : 0;

  const handleGoalTypeClick = (type: string) => {
    const subs = categories.filter((c) => c.goal_type === type);
    const hasSubs = subs.length > 1 || subs.some((c) => c.subcategory);

    if (!hasSubs && subs.length === 1) {
      // No subcategories — go directly to confirmation
      setSelectedType(type);
      setSelectedCategory(subs[0]);
    } else {
      setSelectedType(type);
      setSelectedCategory(null);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <p className="text-muted-foreground font-display">Loading goals...</p>
      </section>
    );
  }

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

        <AnimatePresence mode="wait">
          {/* Step 1: Goal type selection */}
          {!selectedType && (
            <motion.div
              key="types"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="grid grid-cols-2 gap-3"
            >
              {goalTypes.map((type, i) => {
                const meta = goalMeta[type] || { label: type, icon: GraduationCap, description: "" };
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleGoalTypeClick(type)}
                    className="glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:border-primary/20 group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-muted group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
                      {meta.label}
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Step 2: Subcategory selection (if applicable) */}
          {selectedType && hasSubcategories && !selectedCategory && (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-primary transition-colors font-display"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="space-y-3">
                {subcategories.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full glass-card rounded-2xl p-4 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(48_96%_53%/0.1)] group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display font-semibold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max: {formatNaira(cat.max_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">You can claim</p>
                        <p className="font-display font-bold text-primary">
                          {formatNaira(Math.min(totalAnnualSpend, cat.max_price))}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {selectedCategory && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <button
                onClick={() => {
                  if (hasSubcategories) {
                    setSelectedCategory(null);
                  } else {
                    setSelectedType(null);
                    setSelectedCategory(null);
                  }
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-primary transition-colors font-display"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <GlassCard variant="glow">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-display mb-1">
                    {goalMeta[selectedType!]?.label || selectedType}
                  </p>
                  <h3 className="font-display text-xl font-bold text-foreground mb-1">
                    {selectedCategory.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-6">
                    Max price set: {formatNaira(selectedCategory.max_price)}
                  </p>

                  <p className="text-sm text-muted-foreground">Your Claimable Amount</p>
                  <p className="font-display text-3xl font-bold gradient-text mb-1">
                    {formatNaira(claimableAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {totalAnnualSpend >= selectedCategory.max_price
                      ? "You qualify for the full amount!"
                      : `Limited to your annual spend of ${formatNaira(totalAnnualSpend)}`}
                  </p>

                  {/* Progress */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNaira(claimableAmount)} / {formatNaira(selectedCategory.max_price)} ({progress.toFixed(1)}%)
                  </p>

                  <GlassButton
                    variant="primary"
                    className="w-full mt-6 text-base py-4"
                    onClick={() =>
                      onSelect(
                        selectedCategory.subcategory
                          ? `${selectedType}:${selectedCategory.subcategory}`
                          : selectedType!,
                        claimableAmount
                      )
                    }
                  >
                    Claim Now
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default GoalSelector;
