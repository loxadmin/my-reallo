import { useState } from "react";
import { motion } from "framer-motion";
import { Award, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import GlassCard from "@/components/GlassCard";
import DecisionFlow from "@/components/DecisionFlow";
import { cn } from "@/lib/utils";

export type EarnTab = "flow" | "survey";

const EarnCenter = () => {
  const { profile } = useAuth();
  const { formatCurrency: formatNaira } = useCurrency();
  const [activeTab, setActiveTab] = useState<EarnTab>("flow");

  const pointsBalance = profile?.points_balance ?? 0;
  const nairaValue = pointsBalance * 10;

  return (
    <div className="space-y-4">
      <GlassCard variant="strong" className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Award className="w-4 h-4 text-primary" />
          <p className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Points Balance</p>
        </div>
        <h2 className="font-display text-2xl font-bold gradient-text">{pointsBalance.toLocaleString()}</h2>
        <p className="text-muted-foreground mt-1 text-[11px]">= {formatNaira(nairaValue)} value</p>
      </GlassCard>

      <div className="flex gap-2 bg-muted/30 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("flow")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200",
            activeTab === "flow"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="w-4 h-4" />
          Earn Flow
        </button>
        <button
          onClick={() => setActiveTab("survey")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200",
            activeTab === "survey"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          Survey
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "flow" && (
          <DecisionFlow />
        )}

        {activeTab === "survey" && (
          <GlassCard variant="strong" className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Coming Soon</h3>
              <p className="text-[13px] text-muted-foreground max-w-[280px] mx-auto mt-1">
                Answer surveys to earn points. This feature will be available soon!
              </p>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default EarnCenter;
