import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Target } from "lucide-react";

interface Option {
  id: string;
  label: string;
  deposit: number;
  duration_months: number;
  monthly_contribution: number;
  requirements: any;
}

export default function GoalAccountFlow({ onOpened }: { onOpened?: (goalId: string) => void }) {
  const [step, setStep] = useState<"input" | "choose">("input");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);

  const generate = async () => {
    if (!title.trim() || !target) return toast.error("Enter a goal and target amount");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-open-goal", {
        body: { title: title.trim(), target_amount: Number(target), target_date: targetDate || null },
      });
      if (error) throw error;
      setOptions(data?.options ?? []);
      setStep("choose");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate options");
    } finally { setLoading(false); }
  };

  const pick = async (opt: Option) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("open_goal_account", {
        p_title: title.trim(),
        p_target_amount: Number(target),
        p_target_date: targetDate || null,
        p_option_id: opt.id,
      });
      if (error) throw error;
      toast.success("Goal Account opened");
      onOpened?.(data as string);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open goal account");
    } finally { setLoading(false); }
  };

  if (step === "input") {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Open a Goal Account</h3>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Buy a car"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input value={target} onChange={e => setTarget(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Target amount (₦)"
          inputMode="numeric" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <button disabled={loading} onClick={generate}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate AI paths
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Pick the path that fits you. Deposits shorten the timeline; tasks and referrals unlock without deposit.</p>
      {options.map(o => (
        <div key={o.id} className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{o.label}</h4>
            <span className="text-xs text-primary">{o.duration_months} months</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Deposit: ₦{Number(o.deposit).toLocaleString()} · Monthly: ₦{Number(o.monthly_contribution).toLocaleString()}
          </div>
          {o.requirements?.notes && <p className="text-xs">{o.requirements.notes}</p>}
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {o.requirements?.referrals ? <span className="px-2 py-0.5 rounded bg-muted">{o.requirements.referrals} referrals</span> : null}
            {o.requirements?.tasks ? <span className="px-2 py-0.5 rounded bg-muted">{o.requirements.tasks} tasks</span> : null}
            {o.requirements?.purchases ? <span className="px-2 py-0.5 rounded bg-muted">{o.requirements.purchases} partner purchases</span> : null}
          </div>
          <button disabled={loading} onClick={() => pick(o)}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            Choose this path
          </button>
        </div>
      ))}
    </div>
  );
}