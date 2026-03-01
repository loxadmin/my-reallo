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
    <section className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Choose Your Goal</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Where should your <span className="text-primary font-bold">{formatNaira(totalAnnualSpend)}</span> go?
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selectedType && (
            <motion.div
              key="types"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="grid grid-cols-2 gap-4"
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
                    className="glass-card rounded-3xl p-5 text-left transition-all duration-500 hover:bg-white/[0.04] hover:border-primary/30 group"
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 bg-muted/20 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="font-display font-bold text-sm text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                      {meta.label}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{meta.description}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {selectedType && hasSubcategories && !selectedCategory && (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-primary transition-colors font-display font-semibold"
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
                    className="w-full glass-card rounded-2xl p-5 text-left transition-all duration-500 hover:bg-white/[0.04] hover:border-primary/30 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-display font-bold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Max: {formatNaira(cat.max_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">You can claim</p>
                        <p className="font-display font-bold text-primary text-lg">
                          {formatNaira(Math.min(totalAnnualSpend, cat.max_price))}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

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
                className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-primary transition-colors font-display font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <GlassCard variant="glow" className="p-8">
                <div className="text-center space-y-6">
                  <div>
                    <p className="text-xs text-primary uppercase tracking-[0.2em] font-bold mb-1">
                      {goalMeta[selectedType!]?.label || selectedType}
                    </p>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {selectedCategory.label}
                    </h3>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                     <div>
                        <p className="text-sm text-muted-foreground font-medium">Your Claimable Amount</p>
                        <p className="font-display text-4xl font-bold gradient-text">
                          {formatNaira(claimableAmount)}
                        </p>
                     </div>

                     <div className="space-y-2">
                        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {progress.toFixed(1)}% of goal target reached
                        </p>
                     </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {totalAnnualSpend >= selectedCategory.max_price
                      ? "You qualify for the full amount!"
                      : `Limited to your annual spend of ${formatNaira(totalAnnualSpend)}`}
                  </p>

                  <GlassButton
                    variant="primary"
                    className="w-full py-5 clay-primary text-base"
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
