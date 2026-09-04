import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTaskCenter } from "@/hooks/useTaskCenter";
import { Target, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal Goal Account panel shown on every dashboard home:
 * funding progress plus the next milestones that unlock more of the goal.
 */
export default function GoalFundingPanel({ className }: { className?: string }) {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { tasks, enrollments } = useTaskCenter();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("goal_accounts")
        .select("id, title, target_amount, unlocked_amount, status, points_required, points_contributed")
        .eq("user_id", user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setGoal(data ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return null;

  if (!goal) {
    return (
      <button
        onClick={() => navigate("/dashboard/earn")}
        className={cn("w-full rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/40 transition-colors", className)}
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Target className="w-3 h-3 text-primary" /> Goal Account
        </span>
        <p className="mt-2 text-[15px] font-medium text-foreground">Open your Goal Account</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">Pick what you want, choose a plan, and tasks start funding it.</p>
      </button>
    );
  }

  const target = Number(goal.target_amount || 0);
  const unlocked = Number(goal.unlocked_amount || 0);
  const pointsRequired = Number(goal.points_required || 0);
  const pointsDone = Number(goal.points_contributed || 0);
  const pointsLeft = Math.max(0, pointsRequired - pointsDone);
  const pct = pointsRequired > 0 ? Math.min(100, Math.round((pointsDone / pointsRequired) * 100)) : 0;
  const enrolledIds = new Set(enrollments.map((e) => e.task_id));
  const milestones = tasks.filter((t) => !enrolledIds.has(t.id)).slice(0, 2);

  return (
    <div className={cn("w-full rounded-2xl border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Target className="w-3 h-3 text-primary" /> {goal.title}
          </span>
          <p className="mt-1.5 text-[24px] font-light text-foreground leading-none">{formatCurrency(unlocked)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">of {formatCurrency(target)} target · {pointsLeft.toLocaleString()} points to go</p>
        </div>
        <span className="text-[12px] text-primary font-medium">{pct}% funded</span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Next milestones</p>
        {milestones.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate("/dashboard/earn")}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-left hover:border-primary/40 transition-colors"
          >
            <span className="min-w-0">
              <span className="block text-[13px] text-foreground truncate">{t.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t.duration_days > 1 ? `${t.duration_days} days of proof` : "One-off task"}
              </span>
            </span>
            <span className="text-[12px] text-primary shrink-0">+{formatCurrency(Math.round((t.reward_points ?? 0) / 2))}</span>
          </button>
        ))}
        <button
          onClick={() => navigate("/dashboard/earn")}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-left hover:border-primary/40 transition-colors"
        >
          <span className="inline-flex items-center gap-2 text-[13px] text-foreground">
            <Users className="w-3.5 h-3.5 text-primary" /> Refer a friend who completes a task
          </span>
          <span className="text-[12px] text-primary shrink-0">+{formatCurrency(500)}</span>
        </button>
      </div>

      <button onClick={() => navigate("/dashboard/earn")} className="inline-flex items-center gap-1 text-[12px] text-primary">
        See all ways to fund this <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
