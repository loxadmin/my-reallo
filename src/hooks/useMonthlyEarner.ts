import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ME_MIN_REFERRALS = 40;
export const ME_RATE_PER_REFERRAL = 500;
export const ME_BONUS_RATE = 0.2;

export interface MonthlyEarnerRecord {
  id: string;
  user_id: string;
  status: string;
  cycle_index: number;
  cycle_start: string;
  cycle_end: string;
  target_referrals: number;
  last_cycle_referrals: number;
  contact_phone: string | null;
  termination_reason: string | null;
}

export function useMonthlyEarner() {
  const { user } = useAuth();
  const [record, setRecord] = useState<MonthlyEarnerRecord | null>(null);
  const [cycleReferrals, setCycleReferrals] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setRecord(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("monthly_earners" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const row = (data as any) ?? null;
      setRecord(row);

      if (row) {
        const { count } = await supabase
          .from("influencer_referrals" as any)
          .select("id", { count: "exact", head: true })
          .eq("influencer_id", user.id)
          .eq("status", "valid")
          .gte("validated_at", row.cycle_start);
        setCycleReferrals(count ?? 0);

        const { data: wallet } = await supabase
          .from("influencer_wallets" as any)
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();
        setWalletBalance((wallet as any)?.balance ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const join = async () => {
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("join_monthly_earner_program" as any);
      if (error) throw error;
      const result = data as any;
      if (result && result.success === false) throw new Error(result.error ?? "Could not join");
      await load();
    } finally {
      setJoining(false);
    }
  };

  const target = Math.max(ME_MIN_REFERRALS, record?.target_referrals ?? ME_MIN_REFERRALS);
  const base = cycleReferrals * ME_RATE_PER_REFERRAL;
  const bonus = cycleReferrals >= target ? Math.round(base * ME_BONUS_RATE) : 0;
  const daysLeft = record
    ? Math.max(0, Math.ceil((new Date(record.cycle_end).getTime() - Date.now()) / 86400000))
    : 0;

  return {
    record, loading, joining, join, reload: load,
    cycleReferrals, walletBalance, target, base, bonus, daysLeft,
    isMember: record?.status === "active",
    isTerminated: record?.status === "terminated",
  };
}