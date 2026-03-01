import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { GraduationCap, Plane, Briefcase, Home, ChevronRight, ArrowLeft, Target, Trophy } from "lucide-react";

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
      <section className="flex items-center justify-center py-20">
        <p className="text-muted-foreground font-display animate-pulse">Loading goals...</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center py-10 px-2">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl glass border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Select Your Goal</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Where should your {formatNaira(totalAnnualSpend)} go?
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Goal type selection */}
          {!selectedType && (
            <motion.div
              key="types"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 gap-4"
            >
              {goalTypes.map((type, i) => {
                const meta = goalMeta[type] || { label: type, icon: GraduationCap, description: "" };
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleGoalTypeClick(type)}
                    className="layout-grid-item group border border-transparent hover:border-primary/20"
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-primary/10 group-hover:bg-primary transition-colors">
                      <Icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <p className="font-display font-bold text-sm text-foreground text-center">
                      {meta.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium line-clamp-1">
                      {meta.description}
                    </p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Step 2: Subcategory selection */}
          {selectedType && hasSubcategories && !selectedCategory && (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-2 text-xs font-display font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest ml-1"
              >
                <ArrowLeft className="w-4 h-4" /> Change Goal Type
              </button>

              <div className="space-y-3">
                {subcategories.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full glass rounded-2xl p-6 text-left transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Trophy size={48} />
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="space-y-1">
                        <p className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">{cat.label}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          Max Reclaim: {formatNaira(cat.max_price)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
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
                className="flex items-center gap-2 text-xs font-display font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest ml-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>

              <GlassCard variant="glow" className="text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Trophy size={160} />
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-primary/20 text-[10px] font-display font-bold text-primary uppercase tracking-widest mb-2">
                    {goalMeta[selectedType!]?.label || selectedType}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {selectedCategory.label}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total Potential Reclaim: {formatNaira(selectedCategory.max_price)}
                  </p>
                </div>

                <div className="space-y-1 relative z-10">
                  <p className="text-xs text-muted-foreground font-display font-bold uppercase tracking-widest">Your Claimable Amount</p>
                  <p className="font-display text-4xl font-bold gradient-text tracking-tight">
                    {formatNaira(claimableAmount)}
                  </p>
                </div>

                {/* Progress Visual */}
                <div className="space-y-2 relative z-10">
                  <div className="w-full h-2.5 bg-muted/30 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full rounded-full bg-primary shadow-[0_0_15px_hsla(var(--primary)/0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-display font-bold uppercase tracking-widest">
                    <span>Current Progress</span>
                    <span className="text-primary">{progress.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {totalAnnualSpend >= selectedCategory.max_price
                      ? "Congratulations! You qualify for the full amount."
                      : `You qualify for ${formatNaira(claimableAmount)} based on your annual spend.`}
                  </p>
                  <button
                    className="clay-primary w-full py-5 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 group"
                    onClick={() =>
                      onSelect(
                        selectedCategory.subcategory
                          ? `${selectedType}:${selectedCategory.subcategory}`
                          : selectedType!,
                        claimableAmount
                      )
                    }
                  >
                    Set as Active Goal
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

export default GoalSelector;
