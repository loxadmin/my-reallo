import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownToLine, Gift, TrendingUp, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";

interface LeaderEntry {
  id: string;
  label: string;
  amount: number;
  action: string;
}

const actionConfig: Record<string, { icon: typeof Wallet; verb: string }> = {
  saved: { icon: Wallet, verb: "saved" },
  withdrew: { icon: ArrowDownToLine, verb: "withdrew" },
  claimed: { icon: Gift, verb: "claimed" },
  earned: { icon: TrendingUp, verb: "earned" },
  "earned from referral": { icon: Users, verb: "earned from referral" },
};

const LeaderboardTicker = () => {
  const { formatCurrency } = useCurrency();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("leaderboard-feed");
        if (!error && Array.isArray(data)) {
          setEntries(data.filter((e: LeaderEntry) => e.amount > 0));
        }
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (entries.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % entries.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [entries.length]);

  if (entries.length === 0) return null;

  const current = entries[currentIndex];
  const config = actionConfig[current.action] || actionConfig.saved;
  const Icon = config.icon;

  return (
    <div
      className="w-full rounded-xl px-4 py-2.5 overflow-hidden relative"
      style={{
        background: "hsl(160 50% 40% / 0.02)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid hsl(160 50% 45% / 0.08)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex items-center gap-2"
        >
          <Icon className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[13px] text-foreground font-medium">{current.label}</span>
          <span className="text-[13px] text-muted-foreground">{config.verb}</span>
          <span className="text-[13px] text-primary font-bold">{formatCurrency(current.amount)}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardTicker;
