import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowDownToLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";

interface LeaderEntry {
  id: string;
  label: string;
  amount: number;
  type: "saver" | "influencer";
}

const LeaderboardTicker = () => {
  const { formatCurrency } = useCurrency();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const [profilesRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, total_annual_spend, points_balance")
          .gt("total_annual_spend", 0)
          .order("total_annual_spend", { ascending: false })
          .limit(10),
        supabase
          .from("influencer_withdrawals")
          .select("id, user_id, amount, status, profiles!influencer_withdrawals_user_id_fkey(email)")
          .eq("status", "approved")
          .order("amount", { ascending: false })
          .limit(10),
      ]);

      const saverEntries: LeaderEntry[] = (profilesRes.data || []).map((p: any) => {
        const claimable = Math.floor((p.points_balance || 0) * 0.5);
        const username = p.email?.split("@")[0] || "User";
        // Mask: show first 2 chars + *** + last char
        const masked = username.length > 3
          ? username.slice(0, 2) + "***" + username.slice(-1)
          : username.slice(0, 1) + "***";
        return {
          id: `saver-${p.id}`,
          label: masked,
          amount: claimable,
          type: "saver" as const,
        };
      }).filter((e: LeaderEntry) => e.amount > 0);

      const influencerEntries: LeaderEntry[] = (withdrawalsRes.data || []).map((w: any) => {
        const email = (w.profiles as any)?.email || "";
        const username = email.split("@")[0] || "Influencer";
        const masked = username.length > 3
          ? username.slice(0, 2) + "***" + username.slice(-1)
          : username.slice(0, 1) + "***";
        return {
          id: `inf-${w.id}`,
          label: masked,
          amount: w.amount,
          type: "influencer" as const,
        };
      });

      // Interleave savers and influencers
      const merged: LeaderEntry[] = [];
      const maxLen = Math.max(saverEntries.length, influencerEntries.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < saverEntries.length) merged.push(saverEntries[i]);
        if (i < influencerEntries.length) merged.push(influencerEntries[i]);
      }
      setEntries(merged);
    };

    fetchLeaderboard();
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

  return (
    <div className="w-full rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-2.5 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-3 h-3 text-primary shrink-0" />
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Live Leaderboard</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex items-center gap-2"
        >
          {current.type === "saver" ? (
            <>
              <span className="text-[11px] text-foreground font-medium">{current.label}</span>
              <span className="text-[10px] text-muted-foreground">saved</span>
              <span className="text-[11px] text-primary font-bold">{formatCurrency(current.amount)}</span>
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] text-foreground font-medium">{current.label}</span>
              <span className="text-[10px] text-muted-foreground">withdrew</span>
              <span className="text-[11px] text-primary font-bold">{formatCurrency(current.amount)}</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardTicker;
