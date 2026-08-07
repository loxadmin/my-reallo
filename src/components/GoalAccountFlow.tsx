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
    if (!title.trim() || !target) return toast.error("Tell us the goal and how much it costs");
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
      toast.success("Your Goal Account is ready");
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
          <h3 className="font-semibold text-sm">What are you working towards?</h3>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">The thing you want</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Buy a car"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">How much it costs (₦)</p>
          <input value={target} onChange={e => setTarget(e.target.value.replace(/[^0-9]/g, ""))} placeholder="3,000,000"
            inputMode="numeric" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">When you want it (optional)</p>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        </div>
        <button disabled={loading} onClick={generate}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Show me my options
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick the plan that suits you. Put in nothing and do more tasks, or put in some money and do fewer tasks.
      </p>
      {options.map(o => (
        <div key={o.id} className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{o.label}</h4>
            <span className="text-xs text-primary">About {o.duration_months} months</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {Number(o.deposit) > 0
              ? `You put in ₦${Number(o.deposit).toLocaleString()} to start`
              : "You put in nothing to start"}
            {Number(o.monthly_contribution) > 0
              ? ` · then ₦${Number(o.monthly_contribution).toLocaleString()} a month`
              : ""}
          </div>
          {o.requirements?.notes && <p className="text-xs">{o.requirements.notes}</p>}
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            {o.requirements?.referrals ? <span className="px-2 py-0.5 rounded bg-muted">Invite {o.requirements.referrals} people</span> : null}
            {o.requirements?.tasks ? <span className="px-2 py-0.5 rounded bg-muted">Do {o.requirements.tasks} tasks</span> : null}
            {o.requirements?.purchases ? <span className="px-2 py-0.5 rounded bg-muted">Buy from {o.requirements.purchases} partner brands</span> : null}
          </div>
          <button disabled={loading} onClick={() => pick(o)}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            Use this plan
          </button>
        </div>
      ))}
    </div>
  );
}