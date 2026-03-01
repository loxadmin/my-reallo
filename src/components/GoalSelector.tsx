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

const goalMeta: Record<string, { label: string; icon: any; description: string; color: string; bg: string }> = {
  education: { label: "Education", icon: GraduationCap, description: "Fund your academic journey", color: "text-purple-500", bg: "bg-purple-500/10" },
  vacation: { label: "Vacation", icon: Plane, description: "Take your dream trip", color: "text-blue-500", bg: "bg-blue-500/10" },
  business: { label: "Business Funding", icon: Briefcase, description: "Start or grow your business", color: "text-orange-500", bg: "bg-orange-500/10" },
  rent: { label: "Rent Support", icon: Home, description: "Secure your living space", color: "text-green-500", bg: "bg-green-500/10" },
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
      <section className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20 bg-background relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">Set Your Goal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Where should your <span className="text-primary font-bold">{formatNaira(totalAnnualSpend)}</span> be put to work?
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!selectedType && (
            <motion.div
              key="types"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 gap-4"
            >
              {goalTypes.map((type, i) => {
                const meta = goalMeta[type] || { label: type, icon: GraduationCap, description: "", color: "text-primary", bg: "bg-primary/10" };
                const Icon = meta.icon;
                return (
                  <motion.button
                    key={type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleGoalTypeClick(type)}
                    className="glass-card p-6 flex flex-col items-start text-left hover:border-primary/30 group transition-all"
                  >
                    <div className={`p-3 rounded-2xl ${meta.bg} ${meta.color} mb-4 transition-transform group-hover:scale-110`}>
                      <Icon size={24} />
                    </div>
                    <p className="font-bold text-foreground text-sm mb-1">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">{meta.description}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {selectedType && hasSubcategories && !selectedCategory && (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-6 hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div className="space-y-3">
                {subcategories.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full glass-card p-5 text-left flex items-center justify-between group hover:border-primary/20 transition-all shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-foreground group-hover:text-primary transition-colors">{cat.label}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                        Up to {formatNaira(cat.max_price)}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {selectedCategory && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-6 hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <GlassCard variant="blue" className="p-10 text-center relative overflow-hidden group">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  {goalMeta[selectedType!]?.label || selectedType}
                </p>
                <h3 className="text-3xl font-bold text-white mb-8">
                  {selectedCategory.label}
                </h3>

                <div className="space-y-1 mb-8">
                  <p className="text-white/60 text-xs font-medium">Potential Reclaim</p>
                  <p className="text-5xl font-bold text-white tracking-tight">
                    {formatNaira(claimableAmount)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-white/70 uppercase tracking-wider">
                    <span>Target {formatNaira(selectedCategory.max_price)}</span>
                    <span>{progress.toFixed(0)}% Match</span>
                  </div>
                </div>

                <GlassButton
                  variant="secondary"
                  className="w-full mt-10 py-5 bg-white text-blue-600 font-bold hover:bg-white/90"
                  onClick={() =>
                    onSelect(
                      selectedCategory.subcategory
                        ? `${selectedType}:${selectedCategory.subcategory}`
                        : selectedType!,
                      claimableAmount
                    )
                  }
                >
                  Activate Goal
                </GlassButton>
              </GlassCard>

              <p className="text-center text-[10px] text-muted-foreground mt-8 leading-relaxed max-w-[240px] mx-auto">
                Goal selection can be modified later in your profile settings. Target amounts are subject to verification.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default GoalSelector;
