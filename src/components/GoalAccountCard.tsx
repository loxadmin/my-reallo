import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Unlock, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  unlocked_amount: number;
  status: string;
  withdrawn_at: string | null;
  plan: any;
  unlock_sources: any;
  points_required?: number;
  points_contributed?: number;
  deposit_required?: number;
  deposit_paid?: number;
}

/**
 * A Goal Account has no duration: it unlocks once the points target is met.
 * Cashing out creates a withdrawal request that an admin approves manually.
 */
export default function GoalAccountCard({ goal, onChange }: { goal: Goal; onChange?: () => void }) {
  const { formatCurrency } = useCurrency();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contribs, setContribs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("goal_account_contributions")
        .select("*").eq("goal_account_id", goal.id).order("created_at", { ascending: false }).limit(20);
      setContribs(data ?? []);
    })();
  }, [goal.id]);

  const target = Number(goal.target_amount);
  const unlocked = Number(goal.unlocked_amount);
  const pointsRequired = Number(goal.points_required ?? 0);
  const pointsDone = Number(goal.points_contributed ?? 0);
  const pointsLeft = Math.max(0, pointsRequired - pointsDone);
  const depositRequired = Number(goal.deposit_required ?? 0);
  const depositPaid = Number(goal.deposit_paid ?? 0);
  const depositLeft = Math.max(0, depositRequired - depositPaid);
  const pct = pointsRequired > 0 ? Math.min(100, Math.round((pointsDone / pointsRequired) * 100)) : 0;
  const fullyFunded = pointsLeft === 0 && depositLeft === 0;
  const pending = goal.status === "withdrawal_pending";
  const canWithdraw = fullyFunded && !goal.withdrawn_at && goal.status !== "closed" && !pending;

  const withdraw = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("withdraw_goal_account", { p_goal_id: goal.id });
      if (error) throw error;
      const j = data as any;
      if (j?.error) throw new Error(j.error);
      toast.success("Withdrawal request sent for admin approval.");
      onChange?.();
    } catch (e: any) {
      toast.error(e.message ?? "Withdrawal failed");
    } finally { setLoading(false); setConfirm(false); }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">{goal.title}</h3>
          <p className="text-xs text-muted-foreground">Unlocks at {formatCurrency(target)} — no deadline</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded ${goal.status === "closed" ? "bg-muted" : "bg-primary/10 text-primary"}`}>
          {pending ? "awaiting approval" : goal.status}
        </span>
      </div>

      <div className="rounded-xl border border-border/60 p-3 space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">To unlock this goal</p>
        <p className="text-[15px] text-foreground">{pointsRequired.toLocaleString()} points</p>
        {depositRequired > 0 && (
          <p className="text-[12px] text-muted-foreground">+ {formatCurrency(depositRequired)} deposit</p>
        )}
      </div>

      <Progress value={pct} />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted-foreground flex items-center gap-1"><Unlock className="w-3 h-3" />Points earned</div><div className="font-semibold">{pointsDone.toLocaleString()}</div></div>
        <div><div className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" />Points left</div><div className="font-semibold">{pointsLeft.toLocaleString()}</div></div>
        <div><div className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Done</div><div className="font-semibold">{pct}%</div></div>
      </div>

      {depositLeft > 0 && (
        <p className="text-[11px] text-muted-foreground">Deposit outstanding: {formatCurrency(depositLeft)}</p>
      )}

      {contribs.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Where your points came from</summary>
          <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
            {contribs.map(c => (
              <li key={c.id} className="flex justify-between border-b border-border/40 py-1">
                <span className="capitalize">{c.source} {c.note ? `— ${c.note}` : ""}</span>
                <span className="text-primary">+{Number(c.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {goal.status !== "closed" && !goal.withdrawn_at && (
        pending ? (
          <p className="text-[12px] text-muted-foreground">Your withdrawal is with our team for review.</p>
        ) : confirm ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p><strong>You can only cash out once.</strong> Payouts are reviewed manually and only paid to an account matching your legal name.</p>
            </div>
            <div className="flex gap-2">
              <button disabled={loading} onClick={withdraw} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Request {formatCurrency(unlocked)}</button>
              <button disabled={loading} onClick={() => setConfirm(false)} className="px-3 py-2 rounded-lg border text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <button disabled={!canWithdraw} onClick={() => setConfirm(true)}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
            {canWithdraw ? `Cash out ${formatCurrency(unlocked)}` : `${pointsLeft.toLocaleString()} points to go`}
          </button>
        )
      )}
    </div>
  );
}
