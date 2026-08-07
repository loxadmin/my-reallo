import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Unlock, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  unlocked_amount: number;
  status: string;
  withdrawn_at: string | null;
  plan: any;
  unlock_sources: any;
}

export default function GoalAccountCard({ goal, onChange }: { goal: Goal; onChange?: () => void }) {
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
  const locked = Math.max(0, target - unlocked);
  const pct = target > 0 ? Math.min(100, Math.round((unlocked / target) * 100)) : 0;
  const canWithdraw = unlocked >= 50000 && !goal.withdrawn_at && goal.status !== "closed";

  const withdraw = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("withdraw_goal_account", { p_goal_id: goal.id });
      if (error) throw error;
      const j = data as any;
      if (j?.error) throw new Error(j.error);
      toast.success(`Withdrew ₦${Number(j?.amount ?? 0).toLocaleString()}. Goal closed.`);
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
          <p className="text-xs text-muted-foreground">You need ₦{target.toLocaleString()}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded ${goal.status === "closed" ? "bg-muted" : goal.status === "completed" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
          {goal.status}
        </span>
      </div>

      <Progress value={pct} />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted-foreground flex items-center gap-1"><Unlock className="w-3 h-3" />Earned so far</div><div className="font-semibold">₦{unlocked.toLocaleString()}</div></div>
        <div><div className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" />Still to earn</div><div className="font-semibold">₦{locked.toLocaleString()}</div></div>
        <div><div className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Done</div><div className="font-semibold">{pct}%</div></div>
      </div>

      {contribs.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Where your money came from</summary>
          <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
            {contribs.map(c => (
              <li key={c.id} className="flex justify-between border-b border-border/40 py-1">
                <span className="capitalize">{c.source} {c.note ? `— ${c.note}` : ""}</span>
                <span className="text-primary">+₦{Number(c.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {goal.status !== "closed" && !goal.withdrawn_at && (
        confirm ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p><strong>You can only cash out once.</strong> Taking your money now closes this goal for good, and the ₦{locked.toLocaleString()} you haven't earned yet is lost.</p>
            </div>
            <div className="flex gap-2">
              <button disabled={loading} onClick={withdraw} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Yes, cash out ₦{unlocked.toLocaleString()}</button>
              <button disabled={loading} onClick={() => setConfirm(false)} className="px-3 py-2 rounded-lg border text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <button disabled={!canWithdraw} onClick={() => setConfirm(true)}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
            {canWithdraw ? `Cash out ₦${unlocked.toLocaleString()}` : "Earn ₦50,000 before you can cash out"}
          </button>
        )
      )}
    </div>
  );
}