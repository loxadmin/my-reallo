import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact Goal Account summary shown on every dashboard design. */
export default function GoalAccountStrip({ className }: { className?: string }) {
  const [goal, setGoal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("goal_accounts")
        .select("id, title, target_amount, unlocked_amount, status")
        .eq("user_id", auth.user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setGoal(data ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  const open = () => navigate("/dashboard/earn");

  if (!goal) {
    return (
      <button onClick={open} className={cn("w-full glass-card p-4 text-left hover:border-primary/40 transition-colors", className)}>
        <div className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" /> Set up your Goal Account
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Tell us what you're saving towards and pick how you want to reach it.
        </p>
      </button>
    );
  }

  const target = Number(goal.target_amount || 0);
  const unlocked = Number(goal.unlocked_amount || 0);
  const pct = target > 0 ? Math.min(100, Math.round((unlocked / target) * 100)) : 0;

  return (
    <button onClick={open} className={cn("w-full glass-card p-4 text-left space-y-2 hover:border-primary/40 transition-colors", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground truncate inline-flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" /> {goal.title}
        </span>
        <span className="text-[11px] text-primary shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        ₦{unlocked.toLocaleString()} earned of ₦{target.toLocaleString()} · ₦{Math.max(0, target - unlocked).toLocaleString()} still to earn
      </p>
    </button>
  );
}
